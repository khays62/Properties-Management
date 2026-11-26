const DISPLAY_TIME_ZONE = "Africa/Mogadishu";

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getDateTimeParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    dateTimePartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function formatDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = getDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function mogadishuDateTimeToUtc(value: string): string | null {
  if (!value) return null;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Enter a valid expiration date and time.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const parts = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const [year, month, day, hour, minute] = parts;
  const requestedWallTime = Date.UTC(year, month - 1, day, hour, minute);
  const parsedWallTime = new Date(requestedWallTime);
  if (
    parsedWallTime.getUTCFullYear() !== year ||
    parsedWallTime.getUTCMonth() !== month - 1 ||
    parsedWallTime.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("Enter a valid expiration date and time.");
  }

  const displayedParts = getDateTimeParts(new Date(requestedWallTime));
  const displayedWallTime = Date.UTC(
    Number(displayedParts.year),
    Number(displayedParts.month) - 1,
    Number(displayedParts.day),
    Number(displayedParts.hour),
    Number(displayedParts.minute),
    Number(displayedParts.second),
  );
  const offset = displayedWallTime - requestedWallTime;
  return new Date(requestedWallTime - offset).toISOString();
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}
