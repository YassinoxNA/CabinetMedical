import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import { createWriteStream, promises as fs } from "node:fs";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = !app.isPackaged;
const allowedSecureKeys = new Set(["accessToken", "refreshToken", "cabinetUsername", "cabinetPassword"]);
let backendProcess: ChildProcess | null = null;
let portablePostgresStarted = false;
let mainWindow: BrowserWindow | null = null;
let activeDatabaseConfig: { url: string; username: string; password: string } | null = null;
type SoftwareUpdateStatus = {
  state: "idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "not-configured" | "error";
  currentVersion: string;
  availableVersion?: string;
  progress?: number;
  message: string;
};
type SoftwareUpdateManifest = {
  version: string;
  build?: number;
  url: string;
  sha256: string;
  size?: number;
  databaseMigration?: boolean;
  notes?: string;
};
let softwareUpdateStatus: SoftwareUpdateStatus = {
  state: "idle", currentVersion: app.getVersion(), message: "La vérification automatique est prête."
};
let updateCheckInProgress: Promise<SoftwareUpdateStatus> | null = null;
let lastPromptedUpdate = "";
let secureStoreMutationQueue: Promise<void> = Promise.resolve();
const gotSingleInstanceLock = app.requestSingleInstanceLock();

function cabinetLanIpv4Addresses() {
  // Windows expose aussi les cartes Hyper-V, WSL, Docker et les adaptateurs
  // Wi-Fi Direct. Elles ont une IP privee, mais ne sont pas joignables depuis
  // l'autre PC du cabinet. Ne scanner que le vrai reseau local.
  const virtualAdapter = /(^vEthernet\b|Hyper-V|WSL|Docker|Default Switch|VirtualBox|VMware|Loopback|Connexion au r[eé]seau local\*|Local Area Connection\*)/i;
  return Object.entries(networkInterfaces())
    .filter(([name]) => !virtualAdapter.test(name))
    .flatMap(([, items]) => items || [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
}

if (process.platform === "win32") {
  app.setAppUserModelId("ma.cabinetdentaire.desktop");
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = mainWindow ?? BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
}

function secureStorePath() {
  return path.join(app.getPath("userData"), "secure-store.json");
}

async function readSecureStoreFile(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(secureStorePath(), "utf8"));
  } catch {
    return {};
  }
}

async function readSecureStore(): Promise<Record<string, string>> {
  await secureStoreMutationQueue;
  return readSecureStoreFile();
}

function mutateSecureStore(mutator: (store: Record<string, string>) => void) {
  const operation = secureStoreMutationQueue.then(async () => {
    const store = await readSecureStoreFile();
    mutator(store);
    const temporary = `${secureStorePath()}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(store), "utf8");
    await fs.rename(temporary, secureStorePath());
  });
  secureStoreMutationQueue = operation.catch(() => undefined);
  return operation;
}

async function seedCabinetCredentials() {
  if (!safeStorage.isEncryptionAvailable()) return;
  const accounts = await initialAccountEnvironment();
  const username = accounts.INITIAL_DOCTOR_USERNAME || "cabine@SabriDental.com";
  const password = accounts.INITIAL_DOCTOR_PASSWORD || "Sabri@2026!";
  await mutateSecureStore((store) => {
    if (!store.cabinetUsername) store.cabinetUsername = safeStorage.encryptString(username).toString("base64");
    if (!store.cabinetPassword) store.cabinetPassword = safeStorage.encryptString(password).toString("base64");
  });
}

function registerSecureStorage() {
  ipcMain.handle("software-update:status", () => softwareUpdateStatus);
  ipcMain.handle("software-update:check", async () => {
    publishSoftwareUpdateStatus({
      state: "checking",
      currentVersion: app.getVersion(),
      message: "Vérification de la mise à jour en cours…"
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return checkForSoftwareUpdate(true);
  });
  ipcMain.handle("secure-storage:get", async (_event, key: string) => {
    if (!allowedSecureKeys.has(key)) return null;
    const store = await readSecureStore();
    if (!store[key] || !safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(Buffer.from(store[key], "base64"));
  });
  ipcMain.handle("secure-storage:set", async (_event, key: string, value: string) => {
    if (!allowedSecureKeys.has(key) || !safeStorage.isEncryptionAvailable()) return false;
    try {
      await mutateSecureStore((store) => {
        store[key] = safeStorage.encryptString(value).toString("base64");
      });
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("secure-storage:remove", async (_event, key: string) => {
    if (!allowedSecureKeys.has(key)) return false;
    try {
      await mutateSecureStore((store) => { delete store[key]; });
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("cabinet-logo:select", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choisir le logo du cabinet",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }]
    });
    if (result.canceled || result.filePaths.length !== 1) return null;
    const source = result.filePaths[0];
    const extension = path.extname(source).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(extension)) return null;
    const logoDirectory = path.join(app.getPath("userData"), "branding");
    await fs.mkdir(logoDirectory, { recursive: true });
    const destination = path.join(logoDirectory, `cabinet-logo${extension}`);
    await fs.copyFile(source, destination);
    return { path: destination, fileName: path.basename(source) };
  });
  ipcMain.handle("backup-directory:get", async () => {
    try {
      return (await fs.readFile(path.join(app.getPath("userData"), "backup-external-dir.txt"), "utf8")).trim() || null;
    } catch {
      return null;
    }
  });
  ipcMain.handle("backup-directory:local", () => path.join(app.getPath("userData"), "backups"));
  ipcMain.handle("backup-directory:open", async (_event, target: "local" | "external") => {
    let directory = path.join(app.getPath("userData"), "backups");
    if (target === "external") {
      try {
        const configured = (await fs.readFile(path.join(app.getPath("userData"), "backup-external-dir.txt"), "utf8")).trim();
        if (configured) directory = path.resolve(configured);
      } catch {
        return false;
      }
    }
    await fs.mkdir(directory, { recursive: true });
    return (await shell.openPath(directory)) === "";
  });
  ipcMain.handle("backup-directory:select", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choisir le disque ou dossier des sauvegardes",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length !== 1) return null;
    const selected = path.resolve(result.filePaths[0]);
    await fs.writeFile(path.join(app.getPath("userData"), "backup-external-dir.txt"), selected, "utf8");
    return selected;
  });
  ipcMain.handle("backup-file:select", async () => {
    const result = await dialog.showOpenDialog({
      title: "Choisir une sauvegarde à restaurer",
      properties: ["openFile"],
      filters: [{ name: "Sauvegardes Cabinet Dentaire", extensions: ["backup"] }]
    });
    return result.canceled || result.filePaths.length !== 1 ? null : result.filePaths[0];
  });
  ipcMain.handle("backup-file:is-local", async (_event, backupFile: string) => {
    try {
      const resolved = path.resolve(backupFile);
      return path.extname(resolved).toLowerCase() === ".backup"
        && await fs.stat(resolved).then((item) => item.isFile()).catch(() => false);
    } catch {
      return false;
    }
  });
  ipcMain.handle("backup-file:restore", async (_event, backupFile: string) => restoreDatabaseBackup(backupFile));
  ipcMain.handle("backup-file:copy", async (_event, serverUrl: string, backupId: string, suggestedName: string) => {
    let parsed: URL;
    try {
      parsed = new URL(serverUrl);
      const privateHost = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost"
        || /^10\./.test(parsed.hostname) || /^192\.168\./.test(parsed.hostname)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname);
      if (parsed.protocol !== "http:" || parsed.port !== "8080" || !privateHost) throw new Error("Adresse non autorisée");
    } catch {
      return { success: false, message: "L'adresse du serveur du cabinet est invalide." };
    }
    const result = await dialog.showSaveDialog({
      title: "Copier la sauvegarde vers une clé USB ou un dossier",
      defaultPath: suggestedName.endsWith(".backup") ? suggestedName : `${suggestedName}.backup`,
      filters: [{ name: "Sauvegarde Cabinet Dentaire", extensions: ["backup"] }]
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true, message: "" };
    try {
      const store = await readSecureStore();
      const token = store.accessToken && safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(Buffer.from(store.accessToken, "base64")) : "";
      const response = await fetch(`${parsed.origin}/api/v1/backups/${encodeURIComponent(backupId)}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(300000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const temporary = `${result.filePath}.part`;
      await fs.writeFile(temporary, Buffer.from(await response.arrayBuffer()));
      await fs.rename(temporary, result.filePath);
      return { success: true, canceled: false, path: result.filePath, message: "Copie enregistrée avec succès." };
    } catch (error) {
      await fs.rm(`${result.filePath}.part`, { force: true }).catch(() => undefined);
      return { success: false, canceled: false, message: `Copie impossible : ${errorMessage(error)}` };
    }
  });
  ipcMain.handle("cabinet-server:candidates", async () => {
    const addresses = cabinetLanIpv4Addresses();
    const hotspotHost = addresses.includes("192.168.137.1");
    const hotspotClient = addresses.some((address) => address.startsWith("192.168.137."));
    if (hotspotHost) return ["http://127.0.0.1:8080", "http://192.168.137.1:8080"];
    if (hotspotClient) return ["http://192.168.137.1:8080"];
    // Sur un Wi-Fi classique, rechercher automatiquement le serveur du cabinet
    // sur le sous-réseau local. L'assistante ouvre l'application en premier et
    // utilise son serveur local ; le PC docteur retrouve ensuite ce serveur sans
    // afficher de réglage technique dans l'écran de connexion.
    const hosts = new Set<string>();
    for (const address of addresses) {
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address)) continue;
      const octets = address.split(".");
      const prefix = octets.slice(0, 3).join(".");
      for (let host = 1; host <= 254; host += 1) {
        const candidate = `${prefix}.${host}`;
        hosts.add(candidate);
      }
    }

    const reachable = (await Promise.all([...hosts].map(async (host) => {
      const url = `http://${host}:8080`;
      try {
        const response = await fetch(`${url}/api/v1/system/setup-status`, {
          signal: AbortSignal.timeout(700)
        });
        if (!response.ok) return null;
        const status = await response.json() as { installedAt?: number; patientCount?: number };
        return {
          url,
          host,
          installedAt: Number.isFinite(status.installedAt) ? Number(status.installedAt) : 0,
          patientCount: Number.isFinite(status.patientCount) ? Number(status.patientCount) : 0
        };
      } catch {
        return null;
      }
    }))).filter((item): item is { url: string; host: string; installedAt: number; patientCount: number } => Boolean(item));

    // Tous les postes choisissent le serveur installé le plus ancien. En cas
    // d'égalité, l'adresse IP sert de départage stable afin que les deux postes
    // convergent toujours vers une seule base de données.
    const numericIp = (host: string) => host.split(".").reduce((value, part) => value * 256 + Number(part), 0);
    reachable.sort((left, right) => right.patientCount - left.patientCount
      || left.installedAt - right.installedAt
      || numericIp(left.host) - numericIp(right.host));
    return [...reachable.map((item) => item.url), "http://127.0.0.1:8080"];
  });
  ipcMain.handle("cabinet-server:is-local", (_event, serverUrl: string) => {
    try {
      const hostname = new URL(serverUrl).hostname;
      if (["127.0.0.1", "localhost", "::1"].includes(hostname)) return true;
      const addresses = Object.values(networkInterfaces()).flatMap((items) => items || [])
        .filter((item) => item.family === "IPv4")
        .map((item) => item.address);
      return addresses.includes(hostname);
    } catch {
      return false;
    }
  });
}

async function backendIsReady() {
  try {
    const response = await fetch("http://127.0.0.1:8080/actuator/health", { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
}

async function appendDesktopLog(message: string) {
  if (!app.isPackaged) return;
  try {
    const logsDirectory = path.join(app.getPath("userData"), "logs");
    await fs.mkdir(logsDirectory, { recursive: true });
    await fs.appendFile(path.join(logsDirectory, "desktop.log"), `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Le journal ne doit jamais bloquer le démarrage de l'application.
  }
}

function publishSoftwareUpdateStatus(next: SoftwareUpdateStatus) {
  softwareUpdateStatus = next;
  mainWindow?.webContents.send("software-update:status", next);
  return next;
}

function compareVersions(left: string, right: string) {
  const normalize = (value: string) => value.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = normalize(left);
  const b = normalize(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0) ? 1 : -1;
  }
  return 0;
}

async function configuredUpdateManifestUrl() {
  if (process.env.CABINET_UPDATE_MANIFEST_URL?.startsWith("https://")) {
    return process.env.CABINET_UPDATE_MANIFEST_URL;
  }
  if (!app.isPackaged) return "";
  try {
    const configuration = JSON.parse(await fs.readFile(path.join(process.resourcesPath, "config", "update-channel.json"), "utf8"));
    return typeof configuration.manifestUrl === "string" && configuration.manifestUrl.startsWith("https://")
      ? configuration.manifestUrl : "";
  } catch {
    return "";
  }
}

async function installedUpdateBuild() {
  let packagedBuild = 0;
  if (app.isPackaged) {
    try {
      const value = JSON.parse(await fs.readFile(path.join(process.resourcesPath, "config", "update-build.json"), "utf8")) as { build?: number };
      packagedBuild = Number.isFinite(value.build) ? Number(value.build) : 0;
    } catch {
      // Les anciennes installations n'avaient pas encore de numero de build.
    }
  }
  return packagedBuild;
}

async function createPreUpdateBackup(version: string) {
  if (!activeDatabaseConfig) throw new Error("La base locale n'est pas prête pour la sauvegarde de sécurité.");
  const postgresBin = path.join(process.resourcesPath, "postgres", "bin");
  const pgDump = path.join(postgresBin, "pg_dump.exe");
  const backupDirectory = path.join(app.getPath("userData"), "backups");
  await fs.mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const output = path.join(backupDirectory, `cabinet-avant-mise-a-jour-${version}-${stamp}.backup`);
  const connection = activeDatabaseConfig.url.startsWith("jdbc:")
    ? activeDatabaseConfig.url.substring(5) : activeDatabaseConfig.url;
  const environment = {
    ...process.env,
    PGPASSWORD: activeDatabaseConfig.password,
    PATH: [postgresBin, path.join(process.resourcesPath, "runtime", "bin"), process.env.PATH || ""].join(path.delimiter)
  };
  const code = await runCommand(pgDump, [
    "--format=custom", "--no-owner", "--no-privileges",
    `--username=${activeDatabaseConfig.username}`, `--file=${output}`, connection
  ], environment, 300000, true);
  if (code !== 0) throw new Error("La sauvegarde de sécurité avant mise à jour a échoué.");
  await appendDesktopLog(`Sauvegarde avant mise à jour créée: ${output}`);
  return output;
}

async function downloadVerifiedInstaller(manifest: SoftwareUpdateManifest) {
  const downloadUrl = new URL(manifest.url);
  if (downloadUrl.protocol !== "https:") throw new Error("Le téléchargement de mise à jour doit utiliser HTTPS.");
  if (!/^[A-Fa-f0-9]{64}$/.test(manifest.sha256)) throw new Error("La signature SHA-256 de la mise à jour est invalide.");
  const response = await fetch(downloadUrl, { redirect: "follow", signal: AbortSignal.timeout(900000) });
  if (!response.ok || !response.body) throw new Error(`Téléchargement impossible (HTTP ${response.status}).`);
  const total = Number(response.headers.get("content-length") || 0);
  if (manifest.size && total && manifest.size !== total) {
    throw new Error("La taille du fichier ne correspond pas au manifeste de mise a jour.");
  }
  if (total > 600 * 1024 * 1024) throw new Error("Le fichier de mise à jour est trop volumineux.");
  const directory = path.join(app.getPath("temp"), "cabinet-dentaire-updates");
  await fs.mkdir(directory, { recursive: true });
  const installer = path.join(directory, `Cabinet-Dentaire-Setup-${manifest.version}.exe`);
  const file = await fs.open(installer, "w");
  const hash = createHash("sha256");
  let received = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > 600 * 1024 * 1024) throw new Error("Le fichier de mise à jour dépasse la taille autorisée.");
      hash.update(value);
      await file.write(value);
      publishSoftwareUpdateStatus({
        state: "downloading", currentVersion: app.getVersion(), availableVersion: manifest.version,
        progress: total > 0 ? Math.min(100, Math.round((received / total) * 100)) : undefined,
        message: total > 0 ? `Téléchargement de la mise à jour : ${Math.round((received / total) * 100)} %` : "Téléchargement de la mise à jour…"
      });
    }
  } catch (error) {
    await fs.rm(installer, { force: true });
    throw error;
  } finally {
    await file.close();
  }
  const actualHash = hash.digest("hex").toUpperCase();
  if (manifest.size && received !== manifest.size) {
    await fs.rm(installer, { force: true });
    throw new Error("Le fichier de mise a jour telecharge est incomplet.");
  }
  if (actualHash !== manifest.sha256.toUpperCase()) {
    await fs.rm(installer, { force: true });
    throw new Error("Le contrôle de sécurité SHA-256 du fichier téléchargé a échoué.");
  }
  return installer;
}

async function launchInstallerWithWindows(installer: string) {
  // ShellExecute (utilise par shell.openPath) gere correctement la demande UAC
  // requise par notre installateur NSIS per-machine. Un spawn direct peut etre
  // refuse par Windows avec EACCES et produire une erreur JavaScript non geree.
  const launchError = await shell.openPath(installer);
  if (launchError) throw new Error(`Windows n'a pas pu lancer l'installation : ${launchError}`);
}

async function askToInstallUpdate(manifest: SoftwareUpdateManifest) {
  const updateIdentity = `${manifest.version}-${manifest.build || 0}`;
  if (lastPromptedUpdate === updateIdentity) return;
  const options = {
    type: "info" as const,
    title: "Mise à jour Cabinet Dentaire",
    message: `La version ${manifest.version} est disponible.`,
    detail: `${manifest.notes || "Une nouvelle version du logiciel est disponible."}\n\nUne sauvegarde automatique sera créée avant l'installation. Les patients, rendez-vous et factures seront conservés.`,
    buttons: ["Télécharger et installer", "Plus tard"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  };
  const choice = mainWindow ? await dialog.showMessageBox(mainWindow, options) : await dialog.showMessageBox(options);
  if (choice.response !== 0) return;
  lastPromptedUpdate = updateIdentity;
  try {
    const installer = await downloadVerifiedInstaller(manifest);
    publishSoftwareUpdateStatus({
      state: "ready", currentVersion: app.getVersion(), availableVersion: manifest.version,
      progress: 100, message: "Création de la sauvegarde avant installation…"
    });
    await createPreUpdateBackup(manifest.version);
    await appendDesktopLog(`Installation de la mise à jour ${manifest.version}: ${installer}`);
    await launchInstallerWithWindows(installer);
    setTimeout(() => app.quit(), 1200);
  } catch (error) {
    const message = errorMessage(error);
    publishSoftwareUpdateStatus({ state: "error", currentVersion: app.getVersion(), message });
    await appendDesktopLog(`Échec mise à jour: ${message}`);
    dialog.showErrorBox("Mise à jour Cabinet Dentaire", `${message}\n\nLe logiciel et les données actuelles n'ont pas été modifiés.`);
  }
}

async function newestInstallerOnRemovableDrive(currentVersion: string) {
  if (process.platform !== "win32") return null;
  const drives = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | Select-Object -ExpandProperty DeviceID"],
    { windowsHide: true, encoding: "utf8", timeout: 8000 });
  if (drives.status !== 0) return null;
  const candidates: Array<{ path: string; version: string }> = [];
  for (const drive of drives.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    try {
      for (const name of await fs.readdir(`${drive}\\`)) {
        const match = /^Cabinet-Dentaire-Setup-(\d+(?:\.\d+){1,3})-RESEAU\.exe$/i.exec(name);
        if (match && compareVersions(match[1], currentVersion) > 0) candidates.push({ path: path.join(`${drive}\\`, name), version: match[1] });
      }
    } catch {
      // Une clé retirée pendant la vérification est simplement ignorée.
    }
  }
  candidates.sort((left, right) => compareVersions(right.version, left.version));
  return candidates[0]?.path ?? null;
}

async function checkOfflineInstaller(currentVersion: string, detectedInstaller?: string) {
  let selectedInstaller = detectedInstaller;
  if (!selectedInstaller) {
    const result = await dialog.showOpenDialog({
      title: "Choisir la mise à jour depuis une clé USB ou un dossier",
      properties: ["openFile"],
      filters: [{ name: "Installation Cabinet Dentaire", extensions: ["exe"] }]
    });
    if (!result.canceled && result.filePaths.length === 1) selectedInstaller = result.filePaths[0];
  }
  if (!selectedInstaller) {
    return publishSoftwareUpdateStatus({
      state: "idle", currentVersion,
      message: `Version ${currentVersion} installée. Aucune mise à jour sélectionnée.`
    });
  }
  const installer = path.resolve(selectedInstaller);
  const match = /^Cabinet-Dentaire-Setup-(\d+(?:\.\d+){1,3})-RESEAU\.exe$/i.exec(path.basename(installer));
  if (!match) {
    return publishSoftwareUpdateStatus({
      state: "error", currentVersion,
      message: "Fichier non reconnu. Choisissez un Setup Cabinet-Dentaire-…-RESEAU.exe officiel."
    });
  }
  const version = match[1];
  if (compareVersions(version, currentVersion) <= 0) {
    const status = publishSoftwareUpdateStatus({
      state: "up-to-date", currentVersion,
      message: `Le logiciel est à jour (version ${currentVersion}).`
    });
    await dialog.showMessageBox({ type: "info", title: "Mises à jour", message: status.message, buttons: ["OK"] });
    return status;
  }
  const status = publishSoftwareUpdateStatus({
    state: "available", currentVersion, availableVersion: version,
    message: `La version ${version} a été trouvée sur votre support USB.`
  });
  const choice = await dialog.showMessageBox({
    type: "info", title: "Mise à jour Cabinet Dentaire",
    message: `Installer la version ${version} ?`,
    detail: "Choisissez uniquement un installateur Cabinet Dentaire reçu de votre fournisseur. Une sauvegarde complète sera créée avant l'installation.",
    buttons: ["Sauvegarder et installer", "Annuler"], defaultId: 0, cancelId: 1, noLink: true
  });
  if (choice.response !== 0) return status;
  try {
    publishSoftwareUpdateStatus({ state: "ready", currentVersion, availableVersion: version, message: "Création de la sauvegarde avant installation…" });
    await createPreUpdateBackup(version);
    await launchInstallerWithWindows(installer);
    setTimeout(() => app.quit(), 1200);
    return status;
  } catch (error) {
    const message = errorMessage(error);
    await appendDesktopLog(`Échec mise à jour USB: ${message}`);
    return publishSoftwareUpdateStatus({ state: "error", currentVersion, message });
  }
}

async function performSoftwareUpdateCheck(interactive: boolean) {
  const currentVersion = app.getVersion();
  const currentBuild = await installedUpdateBuild();
  const manifestUrl = await configuredUpdateManifestUrl();
  if (!manifestUrl) {
    if (interactive) return checkOfflineInstaller(currentVersion);
    const usbInstaller = await newestInstallerOnRemovableDrive(currentVersion);
    if (usbInstaller) return checkOfflineInstaller(currentVersion, usbInstaller);
    const status = publishSoftwareUpdateStatus({
      state: "not-configured", currentVersion,
      message: `Version ${currentVersion} installée. Cliquez sur « Vérifier maintenant » pour choisir une mise à jour depuis une clé USB.`
    });
    return status;
  }
  publishSoftwareUpdateStatus({ state: "checking", currentVersion, message: "Recherche d'une nouvelle version…" });
  try {
    const response = await fetch(manifestUrl, {
      headers: { "accept": "application/json", "user-agent": `Cabinet-Dentaire/${currentVersion}` },
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 404) {
      return publishSoftwareUpdateStatus({
        state: "up-to-date",
        currentVersion,
        message: "Aucune mise à jour disponible pour le moment."
      });
    }
    if (!response.ok) throw new Error(`Serveur de mise à jour indisponible (HTTP ${response.status}).`);
    const manifest = await response.json() as SoftwareUpdateManifest;
    if (!manifest?.version || !manifest?.url || !manifest?.sha256) throw new Error("Le fichier de mise à jour publié est incomplet.");
    const versionComparison = compareVersions(manifest.version, currentVersion);
    const newerBuildOfSameVersion = versionComparison === 0
      && Number.isFinite(manifest.build)
      && Number(manifest.build) > currentBuild;
    if (versionComparison < 0 || (versionComparison === 0 && !newerBuildOfSameVersion)) {
      const status = publishSoftwareUpdateStatus({ state: "up-to-date", currentVersion, message: `Le logiciel est à jour (version ${currentVersion}).` });
      if (interactive) dialog.showMessageBox({ type: "info", title: "Mises à jour", message: status.message, buttons: ["OK"] });
      return status;
    }
    const status = publishSoftwareUpdateStatus({
      state: "available", currentVersion, availableVersion: manifest.version,
      message: `La version ${manifest.version} est disponible.`
    });
    await askToInstallUpdate(manifest);
    return status;
  } catch (error) {
    const status = publishSoftwareUpdateStatus({ state: "error", currentVersion, message: errorMessage(error) });
    await appendDesktopLog(`Vérification mise à jour impossible: ${status.message}`);
    return status;
  }
}

function checkForSoftwareUpdate(interactive = false) {
  if (updateCheckInProgress) return updateCheckInProgress;
  updateCheckInProgress = performSoftwareUpdateCheck(interactive).finally(() => { updateCheckInProgress = null; });
  return updateCheckInProgress;
}

async function clearLegacyBackupsOnce() {
  const marker = path.join(app.getPath("userData"), "reset-1.5.0.completed");
  if (await fs.access(marker).then(() => true).catch(() => false)) return;
  const directories = [path.join(app.getPath("userData"), "backups")];
  try {
    const configured = (await fs.readFile(path.join(app.getPath("userData"), "backup-external-dir.txt"), "utf8")).trim();
    if (configured) directories.push(path.resolve(configured));
  } catch {
    // Aucun emplacement externe n'était configuré.
  }
  for (const directory of [...new Set(directories)]) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /^cabinet-\d{8}-\d{6}\.backup$/i.test(entry.name)) {
          await fs.rm(path.join(directory, entry.name), { force: true });
        }
      }
    } catch {
      // Un disque externe absent ne doit pas empêcher la réinitialisation.
    }
  }
  await fs.writeFile(marker, new Date().toISOString(), "utf8");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function runCommand(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  timeoutMillis = 60000,
  logFailureOutput = false
) {
  return new Promise<number>((resolve) => {
    let finished = false;
    let commandOutput = "";
    const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env });
    const rememberOutput = (data: Buffer) => {
      commandOutput = `${commandOutput}${data.toString("utf8")}`.slice(-8000);
    };
    child.stdout?.on("data", rememberOutput);
    child.stderr?.on("data", rememberOutput);
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        child.kill();
      } catch {
        // Le processus peut déjà être terminé.
      }
      void appendDesktopLog(`Commande trop longue: ${path.basename(executable)}`);
      resolve(124);
    }, timeoutMillis);
    child.once("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      void appendDesktopLog(`Commande impossible: ${path.basename(executable)} - ${errorMessage(error)}`);
      resolve(1);
    });
    child.once("exit", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (logFailureOutput && code !== 0 && commandOutput.trim()) {
        void appendDesktopLog(`Échec ${path.basename(executable)} (code=${code ?? "null"}): ${commandOutput.trim()}`);
      }
      resolve(code ?? 1);
    });
  });
}

async function stopBackendForRestore() {
  const processToStop = backendProcess;
  if (!processToStop || processToStop.exitCode !== null) {
    backendProcess = null;
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 15000);
    processToStop.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    processToStop.kill();
  });
  backendProcess = null;
}

async function restoreDatabaseBackup(backupFile: string) {
  if (!app.isPackaged || !activeDatabaseConfig) {
    return { success: false, message: "La restauration est disponible uniquement dans l’application Windows installée." };
  }
  const resolvedBackup = path.resolve(backupFile);
  if (path.extname(resolvedBackup).toLowerCase() !== ".backup" || !await fs.stat(resolvedBackup).then((item) => item.isFile()).catch(() => false)) {
    return { success: false, message: "Le fichier de sauvegarde sélectionné est invalide." };
  }
  const connection = activeDatabaseConfig.url.startsWith("jdbc:")
    ? activeDatabaseConfig.url.substring(5) : activeDatabaseConfig.url;
  try {
    const hostname = new URL(connection).hostname;
    if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) {
      return { success: false, message: "La restauration doit être lancée sur le PC qui héberge la base locale." };
    }
  } catch {
    return { success: false, message: "La configuration de la base locale est invalide." };
  }

  const postgresBin = path.join(process.resourcesPath, "postgres", "bin");
  const restoreExecutable = path.join(postgresBin, "pg_restore.exe");
  const restoreEnvironment = {
    ...process.env,
    PGPASSWORD: activeDatabaseConfig.password,
    PATH: [postgresBin, path.join(process.resourcesPath, "runtime", "bin"), process.env.PATH || ""].join(path.delimiter)
  };
  const archiveValid = await runCommand(restoreExecutable, ["--list", resolvedBackup], restoreEnvironment, 30000, true);
  if (archiveValid !== 0) return { success: false, message: "Ce fichier .backup est endommagé ou incompatible." };

  await appendDesktopLog(`Restauration demandée depuis ${resolvedBackup}`);
  await stopBackendForRestore();
  const restoreCode = await runCommand(restoreExecutable, [
    "--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error",
    `--username=${activeDatabaseConfig.username}`, `--dbname=${connection}`, resolvedBackup
  ], restoreEnvironment, 300000, true);
  if (restoreCode !== 0) {
    await appendDesktopLog(`Échec restauration: code=${restoreCode}`);
    setTimeout(() => { app.relaunch(); app.exit(1); }, 1000);
    return { success: false, message: "La restauration a échoué. Le logiciel va redémarrer ; utilisez la sauvegarde de sécurité créée juste avant." };
  }
  await appendDesktopLog("Restauration terminée avec succès.");
  setTimeout(() => { app.relaunch(); app.exit(0); }, 800);
  return { success: true, message: "Restauration terminée. Le logiciel va redémarrer." };
}

async function persistentJwtSecret() {
  const secretPath = path.join(app.getPath("userData"), "backend-secret.bin");
  try {
    const encrypted = await fs.readFile(secretPath);
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(encrypted);
  } catch {
    // Le secret sera créé à la première exécution.
  }
  const secret = randomBytes(64).toString("base64");
  if (safeStorage.isEncryptionAvailable()) await fs.writeFile(secretPath, safeStorage.encryptString(secret));
  return secret;
}

async function persistentInstallationIdentity() {
  const identityPath = path.join(app.getPath("userData"), "installation-identity.json");
  try {
    const identity = JSON.parse(await fs.readFile(identityPath, "utf8")) as { id?: string; createdAt?: number };
    if (identity.id && Number.isFinite(identity.createdAt)) {
      return { id: identity.id, createdAt: Number(identity.createdAt) };
    }
  } catch {
    // L'identité stable est créée une seule fois ci-dessous.
  }
  // Pour une mise à niveau d'anciennes installations, conserver l'ancienneté
  // réelle de la base PostgreSQL. Le PC qui contient la base historique reste
  // ainsi le serveur principal, quel que soit l'ordre de mise à jour des PC.
  const databaseMarker = path.join(app.getPath("userData"), "postgres-data", "PG_VERSION");
  const databaseCreatedAt = await fs.stat(databaseMarker)
    .then((details) => details.birthtimeMs || details.ctimeMs)
    .catch(() => Date.now());
  const identity = { id: randomUUID(), createdAt: Math.round(databaseCreatedAt) };
  await fs.writeFile(identityPath, JSON.stringify(identity), "utf8");
  return identity;
}

async function waitForBackend(attempts = 240) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await backendIsReady()) return true;
    if (backendProcess?.exitCode !== null) break;
  }
  return false;
}

async function initialAccountEnvironment() {
  const environmentPath = app.isPackaged
    ? path.join(process.resourcesPath, "config", "initial-accounts.env")
    : path.join(currentDirectory, "../.env");
  try {
    const content = await fs.readFile(environmentPath, "utf8");
    return Object.fromEntries(content.split(/\r?\n/)
      .map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }));
  } catch {
    return {};
  }
}

async function startBackend(dbUrl: string, javaExecutable: string, jarPath: string, dataDirectory: string, backupDirectory: string, jwtSecret: string, installation: { id: string; createdAt: number }) {
  const javaExists = await fs.access(javaExecutable).then(() => true).catch(() => false);
  const jarExists = await fs.access(jarPath).then(() => true).catch(() => false);
  if (!javaExists || !jarExists) {
    await appendDesktopLog(`Backend non démarré: ressource manquante java=${javaExists} jar=${jarExists}`);
    return false;
  }
  const accountEnvironment = await initialAccountEnvironment();
  const logsDirectory = path.join(app.getPath("userData"), "logs");
  await fs.mkdir(logsDirectory, { recursive: true });
  const backendLog = createWriteStream(path.join(logsDirectory, "backend.log"), { flags: "a" });
  backendLog.write(`\n[${new Date().toISOString()}] Démarrage backend avec DB_URL=${dbUrl}\n`);
  await appendDesktopLog(`Démarrage backend avec DB_URL=${dbUrl}`);
  try {
    backendProcess = spawn(javaExecutable, ["--enable-native-access=ALL-UNNAMED", "-jar", jarPath], {
      cwd: dataDirectory, windowsHide: true, stdio: ["ignore", backendLog, backendLog],
      env: {
        ...process.env,
        ...accountEnvironment,
        DB_URL: dbUrl,
        DB_USERNAME: process.env.CABINET_DB_USERNAME || "postgres",
        DB_PASSWORD: process.env.CABINET_DB_PASSWORD || "1234",
        JWT_SECRET_B64: jwtSecret,
        INSTALLATION_ID: installation.id,
        INSTALLATION_CREATED_AT: String(installation.createdAt),
        // Le backend reste protégé par JWT mais écoute le réseau privé afin que
        // le poste Docteur puisse utiliser la même base que le poste Assistante.
        SERVER_ADDRESS: "0.0.0.0", SERVER_PORT: "8080", DESKTOP_ORIGIN: "null",
        BACKUP_DIR: backupDirectory,
        BACKUP_EXTERNAL_CONFIG_FILE: path.join(app.getPath("userData"), "backup-external-dir.txt"),
        PG_DUMP_PATH: path.join(process.resourcesPath, "postgres", "bin", "pg_dump.exe"),
        PG_RESTORE_PATH: path.join(process.resourcesPath, "postgres", "bin", "pg_restore.exe"),
        BACKUP_RETENTION_COUNT: "30", OPENAPI_ENABLED: "false",
        LOGGING_FILE_NAME: path.join(logsDirectory, "backend-spring.log")
      }
    });
    backendProcess.once("error", (error) => {
      backendLog.write(`[${new Date().toISOString()}] Erreur backend: ${errorMessage(error)}\n`);
      backendLog.end();
      void appendDesktopLog(`Erreur backend: ${errorMessage(error)}`);
    });
    backendProcess.once("exit", (code, signal) => void appendDesktopLog(`Backend arrêté: code=${code ?? "null"} signal=${signal ?? "null"}`));
    backendProcess.once("exit", (code, signal) => {
      backendLog.write(`[${new Date().toISOString()}] Backend arrêté: code=${code ?? "null"} signal=${signal ?? "null"}\n`);
      backendLog.end();
    });
  } catch (error) {
    backendLog.write(`[${new Date().toISOString()}] Backend impossible à lancer: ${errorMessage(error)}\n`);
    backendLog.end();
    await appendDesktopLog(`Backend impossible à lancer: ${errorMessage(error)}`);
    return false;
  }
  const ready = await waitForBackend();
  if (ready) activeDatabaseConfig = {
    url: dbUrl,
    username: process.env.CABINET_DB_USERNAME || "postgres",
    password: process.env.CABINET_DB_PASSWORD || "1234"
  };
  if (!ready) await appendDesktopLog("Backend non prêt après attente.");
  return ready;
}

async function startPortablePostgres() {
  try {
    const postgresRoot = path.join(process.resourcesPath, "postgres");
    const bin = path.join(postgresRoot, "bin");
    const runtimeBin = path.join(process.resourcesPath, "runtime", "bin");
    const cluster = path.join(app.getPath("userData"), "postgres-data");
    const password = process.env.CABINET_DB_PASSWORD || "1234";
    const pgCtl = path.join(bin, "pg_ctl.exe");
    const initDb = path.join(bin, "initdb.exe");
    const createDb = path.join(bin, "createdb.exe");
    const pgIsReady = path.join(bin, "pg_isready.exe");
    const postgresLog = path.join(app.getPath("userData"), "postgres.log");
    for (const executable of [pgCtl, initDb, createDb, pgIsReady]) {
      const exists = await fs.access(executable).then(() => true).catch(() => false);
      if (!exists) {
        await appendDesktopLog(`PostgreSQL portable introuvable: ${executable}`);
        return false;
      }
    }
    const databaseExists = await fs.access(path.join(cluster, "PG_VERSION")).then(() => true).catch(() => false);
    await fs.mkdir(cluster, { recursive: true });
    // PostgreSQL dépend de VCRUNTIME140/MSVCP140. Le runtime Java embarqué contient
    // ces DLL : l'ajouter au PATH rend le paquet autonome sur les PC clients.
    const pgEnvironment = {
      ...process.env,
      PGPASSWORD: password,
      PATH: [bin, runtimeBin, process.env.PATH || ""].filter(Boolean).join(path.delimiter)
    };
    if (!databaseExists) {
      await appendDesktopLog(`Initialisation PostgreSQL portable: ${cluster}`);
      const passwordFile = path.join(app.getPath("temp"), `cabinet-pg-${Date.now()}.txt`);
      await fs.writeFile(passwordFile, password, "utf8");
      try {
        const code = await runCommand(initDb,
          ["-D", cluster, "--username=postgres", "--encoding=UTF8", "--auth-local=scram-sha-256", "--auth-host=scram-sha-256", `--pwfile=${passwordFile}`],
          pgEnvironment, 60000, true);
        if (code !== 0) {
          await appendDesktopLog(`Échec initdb PostgreSQL portable: code=${code}`);
          return false;
        }
      } finally {
        await fs.rm(passwordFile, { force: true });
      }
    }
    const statusCode = await runCommand(pgCtl, ["-D", cluster, "status"], pgEnvironment, 5000);
    if (statusCode !== 0) {
      const startCode = await runCommand(
        pgCtl,
        ["-D", cluster, "-l", postgresLog, "-o", "-p 54329 -h 127.0.0.1", "start"],
        pgEnvironment,
        20000,
        true
      );
      if (startCode !== 0 && startCode !== 124) {
        await appendDesktopLog(`Échec démarrage PostgreSQL portable: code=${startCode}`);
        return false;
      }
    }
    let postgresReady = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const readyCode = await runCommand(pgIsReady, ["-h", "127.0.0.1", "-p", "54329", "-U", "postgres"], pgEnvironment, 3000);
      if (readyCode === 0) {
        postgresReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!postgresReady) {
      await appendDesktopLog("PostgreSQL portable non prêt après attente.");
      return false;
    }
    portablePostgresStarted = true;
    await runCommand(
      createDb,
      ["-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "cabinet_dentaire"],
      pgEnvironment,
      15000,
      true
    );
    return true;
  } catch (error) {
    await appendDesktopLog(`Erreur PostgreSQL portable: ${errorMessage(error)}`);
    return false;
  }
}

async function ensurePackagedBackend() {
  if (!app.isPackaged) return true;
  const javaExecutable = path.join(process.resourcesPath, "runtime", "bin", "java.exe");
  const jarPath = path.join(process.resourcesPath, "backend", "cabinet-dentaire-backend.jar");
  const dataDirectory = path.join(app.getPath("userData"), "data");
  const backupDirectory = path.join(app.getPath("userData"), "backups");
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.mkdir(backupDirectory, { recursive: true });
  const jwtSecret = await persistentJwtSecret();
  const installation = await persistentInstallationIdentity();
  const configuredUrl = process.env.CABINET_DB_URL;
  if (configuredUrl) {
    if (await backendIsReady()) return true;
    if (await startBackend(configuredUrl, javaExecutable, jarPath, dataDirectory, backupDirectory, jwtSecret, installation)) return true;
    if (backendProcess && backendProcess.exitCode === null) backendProcess.kill();
    await appendDesktopLog("Le serveur local n'a pas pu demarrer avec la base configuree.");
    return false;
  }
  if (!await startPortablePostgres()) {
    await appendDesktopLog("Le serveur local n'a pas pu demarrer: PostgreSQL portable indisponible.");
    return false;
  }
  if (await backendIsReady()) return true;
  if (await startBackend("jdbc:postgresql://127.0.0.1:54329/cabinet_dentaire", javaExecutable, jarPath, dataDirectory, backupDirectory, jwtSecret, installation)) return true;
  await appendDesktopLog("Le serveur local n'a pas pu démarrer.");
  return false;
}

function createWindow() {
  const applicationIcon = isDevelopment
    ? path.join(currentDirectory, "../build/icon.png")
    : path.join(process.resourcesPath, "branding", "icon.png");
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: "#071827",
    title: "Cabinet Dentaire",
    icon: applicationIcon,
    autoHideMenuBar: true,
    webPreferences: {
      // Sandboxed preload scripts must be CommonJS. Using .cjs keeps the
      // Windows bridge available even though the application package is ESM.
      preload: path.join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow = window;
  window.once("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDevelopment) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadFile(path.join(currentDirectory, "../dist/index.html"));
  }
}

if (gotSingleInstanceLock) {
app.whenReady().then(async () => {
  registerSecureStorage();
  await seedCabinetCredentials();
  const backendReady = await ensurePackagedBackend();
  // Never remove existing backup archives during startup or an update. They
  // may be the only recovery point available to the cabinet.
  if (!backendReady) {
    const diagnosticLog = path.join(app.getPath("userData"), "logs", "desktop.log");
    dialog.showErrorBox(
      "Cabinet Dentaire",
      `Le serveur local n'a pas pu démarrer. Redémarrez le PC puis réessayez.\n\nJournal de diagnostic :\n${diagnosticLog}`
    );
  }
  createWindow();
  if (app.isPackaged) {
    // La fenêtre de connexion est déjà visible : si une version plus récente
    // existe sur Internet ou à la racine d'une clé USB, la proposition apparaît
    // avant l'authentification sans encombrer la page Paramètres.
    setTimeout(() => void checkForSoftwareUpdate(false), 1500);
    setInterval(() => void checkForSoftwareUpdate(false), 6 * 60 * 60 * 1000);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess && backendProcess.exitCode === null) backendProcess.kill();
  if (portablePostgresStarted) {
    const pgCtl = path.join(process.resourcesPath, "postgres", "bin", "pg_ctl.exe");
    const cluster = path.join(app.getPath("userData"), "postgres-data");
    spawnSync(pgCtl, ["-D", cluster, "-m", "fast", "-w", "stop"], { windowsHide: true, stdio: "ignore", timeout: 30000 });
  }
});
