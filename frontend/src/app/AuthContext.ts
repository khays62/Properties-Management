import { createContext } from "react";

import type { LoginCredentials, User } from "../types/auth";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<User>;
  fetchCurrentUser: () => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
