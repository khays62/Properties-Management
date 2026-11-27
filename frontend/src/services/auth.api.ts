import axios from "axios";

import type {
  LoginCredentials,
  LoginResponse,
  User,
} from "../types/auth";
import { api, refreshAccessToken } from "./api";
import { tokenStorage } from "./tokenStorage";

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "auth/login/",
    credentials,
  );
  tokenStorage.setTokens({
    access: response.data.access,
    refresh: response.data.refresh,
  });
  return response.data;
}

export async function refresh(): Promise<string> {
  return refreshAccessToken();
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<User>("auth/me/");
  return response.data;
}

export interface TenantPasswordSetupInput {
  uid: string;
  token: string;
  new_password: string;
}

export async function setupTenantPassword(
  values: TenantPasswordSetupInput,
): Promise<{ detail: string }> {
  const response = await api.post<{ detail: string }>(
    "auth/tenant-password-setup/",
    values,
  );
  return response.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    if (isRecord(payload)) {
      if (typeof payload.detail === "string") return payload.detail;

      for (const value of Object.values(payload)) {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          const message = value.find(
            (item): item is string => typeof item === "string",
          );
          if (message) return message;
        }
      }
    }

    if (!error.response) {
      return "Unable to reach the server. Check your connection and try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to authenticate. Please try again.";
}
