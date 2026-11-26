import { describe, expect, it } from "vitest";

import {
  formatDateTimeLocal,
  mogadishuDateTimeToUtc,
} from "./dates";

describe("Listing date-time conversion", () => {
  it("converts Mogadishu local time to UTC and back", () => {
    const utcValue = mogadishuDateTimeToUtc("2026-12-01T10:30");

    expect(utcValue).toBe("2026-12-01T07:30:00.000Z");
    expect(formatDateTimeLocal(utcValue)).toBe("2026-12-01T10:30");
  });

  it("rejects invalid local date-time values", () => {
    expect(() => mogadishuDateTimeToUtc("2026-02-31T10:30")).toThrow(
      "Enter a valid expiration date and time.",
    );
  });
});
