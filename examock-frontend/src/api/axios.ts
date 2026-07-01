import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import config from "../utils/config";

// ── Types ───────────────────────────────────────────────────

type AccessToken = string | null;

interface CustomRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

// ── In-memory token store ───────────────────────────────────

let accessToken: AccessToken = null;

export const setAccessToken = (token: AccessToken) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// ── Axios instance ──────────────────────────────────────────

const api = axios.create({
  baseURL: config.API_URL ?? "http://localhost:3000",
  withCredentials: true, // send cookies
});

// ── Request interceptor ─────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh Queue Logic ─────────────────────────────────────

let isRefreshing = false;

let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: AccessToken) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// ── Response interceptor ────────────────────────────────────

api.interceptors.response.use(
  // Handles Success , response 200
  (response) => response,
  
  async (error) => {
    const original = error.config as CustomRequest;

    if (!original) return Promise.reject(error);

    // Only handle 401 once
    if (
  error.response?.status !== 401 ||
  original._retry ||
  original.url?.includes("/auth/refresh")
) {
  return Promise.reject(error);
}

    // ── If refresh already happening → queue request ──
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // 🔥 Call refresh endpoint
      const { data } = await api.post("/auth/refresh");

      const newToken = data.accessToken;

      // Save new token
      setAccessToken(newToken);

      // Retry all queued requests
      processQueue(null, newToken);

      // Retry original request
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;

      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAccessToken(null);

      // Redirect safely
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
