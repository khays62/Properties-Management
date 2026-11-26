export function getListReturnPath(
  state: unknown,
  listPath: string,
  fallback: string,
): string {
  if (
    typeof state !== "object" ||
    state === null ||
    !("returnTo" in state) ||
    typeof state.returnTo !== "string"
  ) {
    return fallback;
  }

  const returnTo = state.returnTo;
  if (
    returnTo !== listPath &&
    !returnTo.startsWith(`${listPath}?`) &&
    !returnTo.startsWith(`${listPath}#`)
  ) {
    return fallback;
  }
  return returnTo;
}
