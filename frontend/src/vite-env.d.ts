/// <reference types="vite/client" />
interface Window {
  desktop?: {
    platform: string;
    version: string;
    selectCabinetLogo(): Promise<{ path: string; fileName: string } | null>;
    getBackupDirectory(): Promise<string | null>;
    getLocalBackupDirectory(): Promise<string>;
    openBackupDirectory(target: "local" | "external"): Promise<boolean>;
    selectBackupDirectory(): Promise<string | null>;
    selectBackupFile(): Promise<string | null>;
    isBackupFileLocal(filePath: string): Promise<boolean>;
    restoreBackupFile(filePath: string): Promise<{ success: boolean; message: string }>;
    copyBackupFile(serverUrl: string, backupId: string, suggestedName: string): Promise<{ success: boolean; canceled?: boolean; path?: string; message: string }>;
    getCabinetServerCandidates(): Promise<string[]>;
    isCabinetServerLocal(serverUrl: string): Promise<boolean>;
    getSoftwareUpdateStatus(): Promise<SoftwareUpdateStatus>;
    checkForSoftwareUpdate(): Promise<SoftwareUpdateStatus>;
    onSoftwareUpdateStatus(callback: (status: SoftwareUpdateStatus) => void): () => void;
    secureStorage: {
      get(key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword"): Promise<string | null>;
      set(key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword", value: string): Promise<boolean>;
      remove(key: "accessToken" | "refreshToken" | "cabinetUsername" | "cabinetPassword"): Promise<boolean>;
    };
  };
}

interface SoftwareUpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "not-configured" | "error";
  currentVersion: string;
  availableVersion?: string;
  progress?: number;
  message: string;
}
