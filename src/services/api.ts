import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { storage } from "../utils/storage";

// Android emulator reaches the host machine via 10.0.2.2; iOS simulator uses localhost
const BASE_URL =
  process.env.API_URL ??
  (typeof __DEV__ !== "undefined" && __DEV__
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000");

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token + cubiculo id ──────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        storage.setAccessToken(data.access_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        storage.clear();
        // Navigation to login is handled by auth store subscriber
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
