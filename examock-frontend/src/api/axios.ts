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
  resolve: (payload: any) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, payload: any) => {
  failedQueue.forEach((prom) => {
    if (payload) {
      prom.resolve(payload);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

/**
 * Exchange the refresh (httpOnly) cookie for a fresh access token.
 * Returns the full /auth/refresh payload ({ accessToken, user, onboarding }).
 * Deduped: if a refresh is already in-flight, callers wait on the same promise
 * instead of firing a second /auth/refresh request. This is the single source
 * of truth used by both the response interceptor (on 401) and useInitAuth (on
 * app boot), so we never hammer the endpoint with concurrent calls.
 */
export async function refreshAccessToken(): Promise<any> {
  if (isRefreshing) {
    // Someone else is refreshing — wait for it and get the payload.
    return new Promise<any>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.accessToken);
    processQueue(null, data);
    return data;
  } catch (err) {
    setAccessToken(null);
    processQueue(err, null);
    throw err;
  } finally {
    isRefreshing = false;
  }
}

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
      return new Promise<any>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((payload) => {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${payload.accessToken}`;
        return api(original);
      });
    }

    original._retry = true;

    try {
      // 🔥 Call refresh endpoint (deduped)
      const data = await refreshAccessToken();
      const newToken = data.accessToken;

      // Retry original request
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;

      return api(original);
    } catch (refreshError) {
      // Redirect safely
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    }
  },
);

export default api;
