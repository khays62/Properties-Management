import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./api", () => ({
  api: { get, post },
  refreshAccessToken: vi.fn(),
}));

vi.mock("./tokenStorage", () => ({
  tokenStorage: {
    setTokens: vi.fn(),
  },
}));

import { setupTenantPassword } from "./auth.api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant password setup API", () => {
  it("posts the invitation token and new password to the backend endpoint", async () => {
    const values = {
      uid: "encoded-user-id",
      token: "one-time-token",
      new_password: "StrongExamplePassword!",
    };
    post.mockResolvedValue({
      data: { detail: "Password set successfully." },
    });

    await expect(setupTenantPassword(values)).resolves.toEqual({
      detail: "Password set successfully.",
    });
    expect(post).toHaveBeenCalledWith(
      "auth/tenant-password-setup/",
      values,
    );
  });
});
