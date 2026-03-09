import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV({ id: "cubículo-storage" });

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;

export const storage = {
  getAccessToken: (): string | undefined => mmkv.getString(KEYS.ACCESS_TOKEN),
  setAccessToken: (token: string): void => mmkv.set(KEYS.ACCESS_TOKEN, token),

  getRefreshToken: (): string | undefined => mmkv.getString(KEYS.REFRESH_TOKEN),
  setRefreshToken: (token: string): void => mmkv.set(KEYS.REFRESH_TOKEN, token),

  setTokens: (access: string, refresh: string): void => {
    mmkv.set(KEYS.ACCESS_TOKEN, access);
    mmkv.set(KEYS.REFRESH_TOKEN, refresh);
  },

  clear: (): void => mmkv.clearAll(),
};
