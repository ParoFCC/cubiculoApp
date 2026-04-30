import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { storage } from "../utils/storage";
import { getActiveServer } from "../store/useServerStore";

// BASE_URL is now dynamic — read from useServerStore at request time.
// This export stays for components that only need the current value at render.
export function getBaseUrl(): string {
  return getActiveServer().url;
}
/** @deprecated use getBaseUrl() — kept for existing imports */
export const BASE_URL: string = getBaseUrl();

const api: AxiosInstance = axios.create({
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token + cubiculo id ──────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Dynamically set baseURL so server toggling works without restarting the app
  config.baseURL = getActiveServer().url;

  const token = storage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach selected cubiculo — imported lazily to avoid circular deps
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useCubiculoStore } = require("../store/useCubiculoStore");
    const cubiculo = useCubiculoStore.getState().selectedCubiculo;
    if (cubiculo && config.headers) {
      config.headers["X-Cubiculo-Id"] = cubiculo.id;
    }
  } catch {
    // store not yet initialized, skip
  }
  return config;
});

// ── Response interceptor: refresh token on 401 ──────────────────────────────
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Clear offline flag on successful response
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useNetworkStore } = require("../store/useNetworkStore");
      useNetworkStore.getState().setOffline(false);
    } catch {
      /* ignore */
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network error → only flag offline when there is truly no HTTP response
    // AND the error code suggests connectivity (not SSL/TLS/DNS/timeout on a
    // reachable server). Axios sets error.code for network-level failures:
    //   ERR_NETWORK          → no route to host
    //   ECONNABORTED         → timeout
    //   ERR_BAD_RESPONSE     → bad TLS / parse error (server reachable)
    // We only show the banner for ERR_NETWORK; everything else (timeout, TLS,
    // DNS, 4xx, 5xx) still has a response or a specific code we skip.
    if (!error.response && error.code === "ERR_NETWORK") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useNetworkStore } = require("../store/useNetworkStore");
        useNetworkStore.getState().setOffline(true, error.code);
      } catch {
        /* ignore */
      }
    }
    // Any error that DID reach the server clears the offline flag
    if (error.response) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useNetworkStore } = require("../store/useNetworkStore");
        useNetworkStore.getState().setOffline(false);
      } catch {
        /* ignore */
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Never try to refresh for auth endpoints themselves
      if (originalRequest.url?.startsWith("/auth/")) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = storage.getRefreshToken();
        const { data } = await axios.post(
          `${getActiveServer().url}/auth/refresh`,
          { refresh_token: refreshToken },
        );
        storage.setAccessToken(data.access_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        storage.clear();
        // Notify the user before clearing — import Toast lazily to avoid circular deps
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Toast = require("react-native-toast-message").default;
          Toast.show({
            type: "error",
            text1: "Sesión expirada",
            text2: "Vuelve a iniciar sesión.",
          });
        } catch {
          /* ignore if Toast not mounted */
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
