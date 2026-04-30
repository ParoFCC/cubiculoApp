import { create } from "zustand";

interface NetworkState {
  isOffline: boolean;
  lastError: string | null;
  setOffline: (offline: boolean, errorCode?: string) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  lastError: null,
  setOffline: (offline, errorCode) =>
    set({ isOffline: offline, lastError: errorCode ?? null }),
}));
