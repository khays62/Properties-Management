export function getSafeRedirectPath(
  state: unknown,
  fallback = "/",
): string {
  if (
    typeof state !== "object" ||
    state === null ||
    !("from" in state) ||
    typeof state.from !== "object" ||
    state.from === null ||
    !("pathname" in state.from) ||
    typeof state.from.pathname !== "string"
  ) {
    return fallback;
  }

  const pathname = state.from.pathname;
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname === "/login"
  ) {
    return fallback;
  }

  return pathname;
}
