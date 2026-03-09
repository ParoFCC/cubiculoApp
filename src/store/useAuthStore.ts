import { create } from "zustand";
import { User } from "../types/auth.types";
import { authService } from "../services/authService";
import { storage } from "../utils/storage";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const tokens = await authService.login({ email, password });
    storage.setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authService.me();
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout().catch(() => {});
    storage.clear();
    set({ user: null, isAuthenticated: false });
  },

  rehydrate: async () => {
    const token = storage.getAccessToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      storage.clear();
      set({ isLoading: false });
    }
  },
}));
