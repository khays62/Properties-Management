import { describe, expect, it } from "vitest";

import { getListingAvailableActions } from "../utils/transitions";

describe("listing action availability", () => {
  it("allows publishing drafts and republishing paused listings", () => {
    expect(getListingAvailableActions("DRAFT")).toEqual(["publish"]);
    expect(getListingAvailableActions("PAUSED")).toEqual(["publish"]);
  });

  it("allows pausing and closing published listings only", () => {
    expect(getListingAvailableActions("PUBLISHED")).toEqual([
      "pause",
      "close",
    ]);
  });

  it("does not offer transitions for closed or expired listings", () => {
    expect(getListingAvailableActions("CLOSED")).toEqual([]);
    expect(getListingAvailableActions("EXPIRED")).toEqual([]);
  });
});
