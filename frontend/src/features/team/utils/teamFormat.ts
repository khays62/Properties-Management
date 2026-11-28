export function formatTeamDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function formatTeamRole(role: string): string {
  return role === "PROPERTY_MANAGER" ? "Property Manager" : "Accountant";
}
