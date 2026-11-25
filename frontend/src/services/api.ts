import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import type { RefreshResponse } from "../types/auth";
import { tokenStorage } from "./tokenStorage";

export const AUTH_SESSION_EXPIRED_EVENT = "omniproperties:session-expired";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be configured.");
}

export const API_BASE_URL = configuredBaseUrl.endsWith("/")
  ? configuredBaseUrl
  : `${configuredBaseUrl}/`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

function expireSession(): void {
  tokenStorage.clearTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

async function requestNewAccessToken(): Promise<string> {
  try {
    const refresh = tokenStorage.getRefreshToken();
    if (!refresh) {
      throw new Error("No refresh token is available.");
    }

    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}auth/token/refresh/`,
      { refresh },
      { timeout: 15_000 },
    );

    if (!response.data.access) {
      throw new Error("The token refresh response did not include an access token.");
    }

    tokenStorage.setTokens({
      access: response.data.access,
      refresh: response.data.refresh ?? refresh,
    });

    return response.data.access;
  } catch (error) {
    expireSession();
    throw error;
  }
}

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

function isAuthenticationEndpoint(url?: string): boolean {
  return Boolean(
    url?.includes("auth/login/") ||
      url?.includes("auth/token/refresh/"),
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableRequestConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      isAuthenticationEndpoint(config.url)
    ) {
      return Promise.reject(error);
    }

    if (config._retry) {
      expireSession();
      return Promise.reject(error);
    }

    config._retry = true;
    if (!tokenStorage.getRefreshToken()) {
      expireSession();
      return Promise.reject(error);
    }

    try {
      const accessToken = await refreshAccessToken();
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return await api.request(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
