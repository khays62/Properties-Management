import { describe, expect, it } from "vitest";

import {
  getRenewalAlertActions,
  isRenewalAlertStatus,
} from "../utils/actions";
import type { RenewalAlertStatus } from "../types/renewal";

const alert = (status: RenewalAlertStatus) => ({ status });

describe("renewal alert actions", () => {
  it("only exposes alert actions allowed by status and role", () => {
    expect(getRenewalAlertActions(alert("UNREAD"), true)).toEqual([
      "mark-read",
      "resolve",
    ]);
    expect(getRenewalAlertActions(alert("READ"), true)).toEqual(["resolve"]);
    expect(getRenewalAlertActions(alert("RESOLVED"), true)).toEqual([]);
    expect(getRenewalAlertActions(alert("UNREAD"), false)).toEqual([]);
  });

  it("recognizes only backend renewal alert statuses", () => {
    expect(isRenewalAlertStatus("UNREAD")).toBe(true);
    expect(isRenewalAlertStatus("PENDING")).toBe(false);
  });
});
