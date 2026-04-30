import { create } from "zustand";

interface NetworkState {
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),
}));
