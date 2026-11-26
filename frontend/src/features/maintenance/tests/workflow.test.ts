import { describe, expect, it } from "vitest";

import {
  getMaintenanceActions,
  isMaintenanceStatus,
} from "../utils/workflow";
import type { MaintenanceStatus } from "../types/maintenance";

const ticket = (status: MaintenanceStatus) => ({
  status,
  tenant: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
});

describe("maintenance action availability", () => {
  it("only exposes backend-supported actions for the current status and role", () => {
    expect(getMaintenanceActions(ticket("OPEN"), true)).toEqual([
      "assign",
      "cancel",
    ]);
    expect(getMaintenanceActions(ticket("OPEN"), false)).toEqual(["cancel"]);
    expect(getMaintenanceActions(ticket("ASSIGNED"), true)).toEqual(["start"]);
    expect(getMaintenanceActions(ticket("IN_PROGRESS"), true)).toEqual([
      "resolve",
    ]);
    expect(getMaintenanceActions(ticket("RESOLVED"), true)).toEqual(["close"]);
    expect(getMaintenanceActions(ticket("CLOSED"), true)).toEqual([]);
    expect(getMaintenanceActions(ticket("CANCELLED"), true)).toEqual([]);
  });

  it("recognizes only backend-defined maintenance statuses", () => {
    expect(isMaintenanceStatus("IN_PROGRESS")).toBe(true);
    expect(isMaintenanceStatus("PENDING")).toBe(false);
  });
});
