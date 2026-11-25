export const USER_ROLES = [
  "OWNER",
  "PROPERTY_MANAGER",
  "ACCOUNTANT",
  "TENANT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RefreshResponse {
  access: string;
  refresh?: string;
}
