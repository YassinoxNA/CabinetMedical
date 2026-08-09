import { create } from "zustand";
import { api, ensureAutomaticServerConnection } from "../services/api";
import type { AuthResponse, UserSummary } from "../types";

interface AuthState {
  user: UserSummary | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (username, password) => {
    const auth = await api.post<AuthResponse>("/auth/login", { username, password });
    await api.saveTokens(auth);
    await api.saveRememberedCredentials(username, password);
    set({ user: auth.user, loading: false });
    return auth;
  },
  restore: async () => {
    try {
      await ensureAutomaticServerConnection();
      // A fresh application start must always stop at the login screen. The
      // Windows-encrypted username/password remain available to prefill the
      // form, but an old JWT must never open the dashboard against another PC
      // or another local backend instance.
      await api.clearTokens();
      set({ user: null, loading: false });
    } catch {
      await api.clearTokens();
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    await api.logout();
    set({ user: null, loading: false });
  }
}));
