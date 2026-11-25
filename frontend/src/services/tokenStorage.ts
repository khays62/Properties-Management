import type { AuthTokens } from "../types/auth";

const ACCESS_TOKEN_KEY = "omniproperties.accessToken";
const REFRESH_TOKEN_KEY = "omniproperties.refreshToken";

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Token storage is only available in a browser.");
  }

  return window.localStorage;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return getStorage().getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return getStorage().getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(tokens: AuthTokens): void {
    if (!tokens.access || !tokens.refresh) {
      throw new Error("Both access and refresh tokens are required.");
    }

    const storage = getStorage();
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  },

  clearTokens(): void {
    const storage = getStorage();
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  },
};
