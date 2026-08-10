const { contextBridge, ipcRenderer } = require("electron") as typeof import("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  version: process.versions.electron,
  selectCabinetLogo: () => ipcRenderer.invoke("cabinet-logo:select") as Promise<{ path: string; fileName: string } | null>,
  getBackupDirectory: () => ipcRenderer.invoke("backup-directory:get") as Promise<string | null>,
  getLocalBackupDirectory: () => ipcRenderer.invoke("backup-directory:local") as Promise<string>,
  openBackupDirectory: (target: "local" | "external") => ipcRenderer.invoke("backup-directory:open", target) as Promise<boolean>,
  selectBackupDirectory: () => ipcRenderer.invoke("backup-directory:select") as Promise<string | null>,
  selectBackupFile: () => ipcRenderer.invoke("backup-file:select") as Promise<string | null>,
  isBackupFileLocal: (filePath: string) => ipcRenderer.invoke("backup-file:is-local", filePath) as Promise<boolean>,
  restoreBackupFile: (filePath: string) => ipcRenderer.invoke("backup-file:restore", filePath) as Promise<{ success: boolean; message: string }>,
  copyBackupFile: (serverUrl: string, backupId: string, suggestedName: string) => ipcRenderer.invoke("backup-file:copy", serverUrl, backupId, suggestedName) as Promise<{ success: boolean; canceled?: boolean; path?: string; message: string }>,
  getCabinetServerCandidates: () => ipcRenderer.invoke("cabinet-server:candidates") as Promise<string[]>,
  isCabinetServerLocal: (serverUrl: string) => ipcRenderer.invoke("cabinet-server:is-local", serverUrl) as Promise<boolean>,
  syncEmergencyMirror: (serverUrl: string, force = false) => ipcRenderer.invoke("emergency-mirror:sync", serverUrl, force) as Promise<{ success: boolean; syncedAt?: number; message: string }>,
  getEmergencyMirrorStatus: () => ipcRenderer.invoke("emergency-mirror:status") as Promise<{ available: boolean; syncedAt?: number; restoredAt?: number; sourceUrl?: string }>,
  restoreEmergencyMirror: () => ipcRenderer.invoke("emergency-mirror:restore") as Promise<{ success: boolean; message: string }>,
  getSoftwareUpdateStatus: () => ipcRenderer.invoke("software-update:status"),
  checkForSoftwareUpdate: () => ipcRenderer.invoke("software-update:check"),
  onSoftwareUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on("software-update:status", listener);
    return () => ipcRenderer.removeListener("software-update:status", listener);
  },
  secureStorage: {
    get: (key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword") => ipcRenderer.invoke("secure-storage:get", key) as Promise<string | null>,
    set: (key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword", value: string) => ipcRenderer.invoke("secure-storage:set", key, value) as Promise<boolean>,
    remove: (key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword") => ipcRenderer.invoke("secure-storage:remove", key) as Promise<boolean>
  }
});
