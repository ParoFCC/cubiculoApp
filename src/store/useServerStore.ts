/**
 * Server selection store — persisted in MMKV so the choice survives app restarts.
 * Supports toggling between the two known backends.
 */
import { create } from "zustand";
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV({ id: "cubículo-storage" });
const KEY = "selected_server";

export const SERVERS = [
  {
    id: "castcarp",
    label: "PROD SSL",
    url: "https://cubiculo-api.castelancarpinteyro.com",
    color: "#14532d",
    textColor: "#d1fae5",
  },
  {
    id: "droplet",
    label: "PROD SSL 2",
    url: "https://cubiculo.psic-danieladiaz.com",
    color: "#1e3a5f",
    textColor: "#bfdbfe",
  },
] as const;

export type ServerId = (typeof SERVERS)[number]["id"];

function loadSaved(): ServerId {
  const saved = mmkv.getString(KEY);
  if (saved === "droplet" || saved === "castcarp") return saved;
  return "castcarp";
}

interface ServerState {
  serverId: ServerId;
  setServer: (id: ServerId) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  serverId: loadSaved(),
  setServer: (id) => {
    mmkv.set(KEY, id);
    set({ serverId: id });
  },
}));

export function getActiveServer() {
  const id = useServerStore.getState().serverId;
  return SERVERS.find((s) => s.id === id) ?? SERVERS[0];
}
