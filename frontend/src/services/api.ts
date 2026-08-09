import type { ApiError, AuthResponse } from "../types";

const DEFAULT_SERVER_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8081"
  : "http://127.0.0.1:8080";
const SERVER_URL_STORAGE_KEY = "cabinet.serverUrl";
const SERVER_DISCOVERY_VERSION_KEY = "cabinet.serverDiscoveryVersion";
// Force une nouvelle detection apres la correction qui donne toujours la
// priorite au serveur LAN contenant les donnees partagees.
const SERVER_DISCOVERY_VERSION = "1.7.3-shared-data-v2";
type SecureKey = "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword";

export function normalizeServerUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
  if (!trimmed) return DEFAULT_SERVER_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function getServerUrl() {
  return normalizeServerUrl(localStorage.getItem(SERVER_URL_STORAGE_KEY) || DEFAULT_SERVER_URL);
}

export function setServerUrl(value: string) {
  localStorage.setItem(SERVER_URL_STORAGE_KEY, normalizeServerUrl(value));
}

export function isUsingLocalServer() {
  return /:\/\/(127\.0\.0\.1|localhost)(:|$)/i.test(getServerUrl());
}

export async function isServerOnThisComputer() {
  if (isUsingLocalServer()) return true;
  return window.desktop?.isCabinetServerLocal(getServerUrl()) ?? false;
}

export async function testServerConnection(value: string) {
  const response = await fetch(`${normalizeServerUrl(value)}/api/v1/system/setup-status`, {
    signal: AbortSignal.timeout(4000)
  });
  return response.ok;
}

export async function ensureAutomaticServerConnection() {
  // Keep local development isolated from the installed application. The
  // packaged desktop server owns 8080; source/IDE runs use 8081.
  if (import.meta.env.DEV) {
    setServerUrl(DEFAULT_SERVER_URL);
    await testServerConnection(DEFAULT_SERVER_URL);
    return DEFAULT_SERVER_URL;
  }
  if (localStorage.getItem(SERVER_DISCOVERY_VERSION_KEY) !== SERVER_DISCOVERY_VERSION) {
    localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    localStorage.setItem(SERVER_DISCOVERY_VERSION_KEY, SERVER_DISCOVERY_VERSION);
  }
  const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
  const detected = await window.desktop?.getCabinetServerCandidates() ?? [DEFAULT_SERVER_URL];
  // Electron classe deja les serveurs par nombre de patients puis par
  // anciennete. Tester cette liste avant l'adresse memorisee evite qu'un PC
  // secondaire reste bloque sur sa base locale vide apres une restauration
  // effectuee sur le PC principal.
  const candidates = [...new Set([
    ...detected.map(normalizeServerUrl),
    ...(saved ? [normalizeServerUrl(saved)] : [])
  ])];
  for (const candidate of candidates) {
    try {
      if (await testServerConnection(candidate)) {
        setServerUrl(candidate);
        return candidate;
      }
    } catch {
      // Essayer automatiquement l'adresse suivante.
    }
  }
  throw new Error("CABINET_SERVER_NOT_FOUND");
}

function apiUrl() {
  return `${getServerUrl()}/api/v1`;
}

async function getToken(key: SecureKey) {
  return window.desktop?.secureStorage ? window.desktop.secureStorage.get(key) : localStorage.getItem(`cabinet.${key}`);
}
async function setToken(key: SecureKey, value: string) {
  if (window.desktop?.secureStorage) await window.desktop.secureStorage.set(key, value);
  else localStorage.setItem(`cabinet.${key}`, value);
}
async function removeToken(key: SecureKey) {
  if (window.desktop?.secureStorage) await window.desktop.secureStorage.remove(key);
  else localStorage.removeItem(`cabinet.${key}`);
}

export class ApiClient {
  private reauthentication: Promise<boolean> | null = null;

  private async reauthenticate(): Promise<boolean> {
    if (this.reauthentication) return this.reauthentication;

    this.reauthentication = (async () => {
      const credentials = await this.getRememberedCredentials();
      if (!credentials) return false;

      try {
        const response = await fetch(`${apiUrl()}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials)
        });
        if (!response.ok) return false;
        await this.saveTokens(await response.json() as AuthResponse);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      this.reauthentication = null;
    });

    return this.reauthentication;
  }

  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const token = await getToken("accessToken");
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(`${apiUrl()}${path}`, { ...options, headers });
    } catch {
      throw {
        status: 0,
        code: "NETWORK_ERROR",
        message: "Le serveur du cabinet ne répond pas correctement."
      } as ApiError;
    }
    if (response.status === 401 && retry && !path.startsWith("/auth/")) {
      const refreshed = await getToken("refreshToken") ? await this.refresh() : false;
      if (refreshed || await this.reauthenticate()) return this.request<T>(path, options, false);

      await this.clearTokens();
      window.dispatchEvent(new CustomEvent("cabinet:session-expired"));
    }
    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        status: response.status,
        code: "NETWORK_ERROR",
        message: "Le serveur du cabinet ne répond pas correctement."
      }))) as ApiError;
      throw error;
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async refresh(): Promise<boolean> {
    const refreshToken = await getToken("refreshToken");
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${apiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) throw new Error();
      const auth = (await response.json()) as AuthResponse;
      await this.saveTokens(auth);
      return true;
    } catch {
      await this.clearTokens();
      return false;
    }
  }

  async saveTokens(auth: AuthResponse) {
    await setToken("accessToken", auth.accessToken);
    await setToken("refreshToken", auth.refreshToken);
  }

  async saveRememberedCredentials(username: string, password: string) {
    if (!window.desktop?.secureStorage) return false;
    const results = [
      await setToken("cabinetUsername", username.trim()),
      await setToken("cabinetPassword", password)
    ];
    return results.every(Boolean);
  }

  async getRememberedCredentials() {
    if (!window.desktop?.secureStorage) return null;
    const [username, password] = await Promise.all([
      getToken("cabinetUsername"), getToken("cabinetPassword")
    ]);
    return username && password ? { username, password } : null;
  }

  async clearRememberedCredentials() {
    await removeToken("cabinetUsername");
    await removeToken("cabinetPassword");
  }

  async clearTokens() {
    await removeToken("accessToken");
    await removeToken("refreshToken");
  }

  async logout() {
    const refreshToken = await getToken("refreshToken");
    try {
      if (refreshToken) await this.post("/auth/logout", { refreshToken });
    } catch {
      // La session locale doit toujours pouvoir être fermée, même si le backend est arrêté.
    } finally {
      await this.clearTokens();
      // La déconnexion ferme uniquement la session. Les identifiants du compte
      // unique restent chiffrés par Windows pour préremplir le prochain login.
    }
  }

  async hasSession() {
    return Boolean(await getToken("accessToken"));
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>(path, { method: "DELETE" }); }
  upload<T>(path: string, form: FormData) {
    return this.request<T>(path, { method: "POST", body: form });
  }

  async download(path: string, fileName: string) {
    const token = await getToken("accessToken");
    const response = await fetch(`${apiUrl()}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error("Téléchargement impossible");
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
