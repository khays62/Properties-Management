import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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
import { toastService } from "../services/toastService";
import type { LoginCredentials, User } from "../types/auth";
import { AuthContext, type AuthStatus } from "./AuthContext";

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionExpiredRef = useRef(false);
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
      sessionExpiredRef.current = false;
      setError(null);
      try {
        await loginRequest(credentials);
        const currentUser = await fetchCurrentUser();
        sessionExpiredRef.current = false;
        return currentUser;
      } catch (loginError) {
        const sessionExpired = sessionExpiredRef.current;
        tokenStorage.clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        setError(
          sessionExpired
            ? "Your session has expired. Please sign in again."
            : getAuthErrorMessage(loginError),
        );
        throw loginError;
      }
    },
    [fetchCurrentUser],
  );

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    sessionExpiredRef.current = false;
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
      const sessionExpired = sessionExpiredRef.current;
      tokenStorage.clearTokens();
      setUser(null);
      setStatus("unauthenticated");
      setError(
        sessionExpired
          ? "Your session has expired. Please sign in again."
          : getAuthErrorMessage(refreshError),
      );
      throw refreshError;
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    let active = true;

    const handleSessionExpired = () => {
      if (sessionExpiredRef.current) return;
      sessionExpiredRef.current = true;
      const message = "Your session has expired. Please sign in again.";
      setUser(null);
      setStatus("unauthenticated");
      setError(message);
      void queryClient.cancelQueries().then(() => queryClient.clear());
      toastService.error(message);
      navigate("/login", { replace: true });
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

        const message = sessionExpiredRef.current
          ? "Your session has expired. Please sign in again."
          : getAuthErrorMessage(bootstrapError);
        setUser(null);
        setStatus("unauthenticated");
        setError(message);
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
  }, [navigate, queryClient]);

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
