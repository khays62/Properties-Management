import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AUTH_SESSION_EXPIRED_EVENT,
} from "../services/api";
import {
  fetchCurrentUser as fetchCurrentUserRequest,
  getAuthErrorMessage,
  login as loginRequest,
  refresh as refreshRequest,
} from "../services/auth.api";
import { tokenStorage } from "../services/tokenStorage";
import type { LoginCredentials, User } from "../types/auth";
import { AuthContext, type AuthStatus } from "./AuthContext";

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const currentUser = await fetchCurrentUserRequest();
    setUser(currentUser);
    setStatus("authenticated");
    setError(null);
    return currentUser;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setError(null);
      try {
        await loginRequest(credentials);
        return await fetchCurrentUser();
      } catch (loginError) {
        tokenStorage.clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        setError(getAuthErrorMessage(loginError));
        throw loginError;
      }
    },
    [fetchCurrentUser],
  );

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await refreshRequest();
      return await fetchCurrentUser();
    } catch (refreshError) {
      tokenStorage.clearTokens();
      setUser(null);
      setStatus("unauthenticated");
      setError(getAuthErrorMessage(refreshError));
      throw refreshError;
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    let active = true;

    const handleSessionExpired = () => {
      setUser(null);
      setStatus("unauthenticated");
      setError("Your session has expired. Please sign in again.");
    };

    const bootstrap = async () => {
      try {
        if (
          !tokenStorage.getAccessToken() &&
          !tokenStorage.getRefreshToken()
        ) {
          if (active) setStatus("unauthenticated");
          return;
        }

        const currentUser = await fetchCurrentUserRequest();
        if (!active) return;

        setUser(currentUser);
        setStatus("authenticated");
        setError(null);
      } catch (bootstrapError) {
        if (!active) return;

        setUser(null);
        setStatus("unauthenticated");
        setError(getAuthErrorMessage(bootstrapError));
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    void bootstrap();

    return () => {
      active = false;
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      login,
      logout,
      refresh,
      fetchCurrentUser,
    }),
    [user, status, error, login, logout, refresh, fetchCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
