import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { setupTenantPassword } = vi.hoisted(() => ({
  setupTenantPassword: vi.fn(),
}));

vi.mock("../services/auth.api", () => ({
  getAuthErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Password setup failed.",
  setupTenantPassword,
}));

import { TenantPasswordSetupPage } from "./TenantPasswordSetupPage";

function LoginRoute() {
  const location = useLocation();
  const success =
    typeof location.state === "object" &&
    location.state !== null &&
    "passwordSetupSuccess" in location.state &&
    location.state.passwordSetupSuccess === true;
  return <p>{success ? "Password setup completed" : "Login route"}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupTenantPassword.mockResolvedValue({ detail: "Password set successfully." });
});

afterEach(cleanup);

function renderPasswordSetup(url: string) {
  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={[url]}
    >
      <Routes>
        <Route
          path="/set-password"
          element={<TenantPasswordSetupPage />}
        />
        <Route path="/login" element={<LoginRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TenantPasswordSetupPage", () => {
  it("validates the token and redirects to sign in after successful setup", async () => {
    const user = userEvent.setup();
    renderPasswordSetup(
      "/set-password/?uid=encoded-user-id&token=one-time-token",
    );

    await user.type(
      screen.getByLabelText("New password"),
      "StrongExamplePassword!",
    );
    await user.type(
      screen.getByLabelText("Confirm password"),
      "StrongExamplePassword!",
    );
    await user.click(screen.getByRole("button", { name: "Set password" }));

    expect(await screen.findByText("Password setup completed")).toBeVisible();
    expect(setupTenantPassword).toHaveBeenCalledWith({
      uid: "encoded-user-id",
      token: "one-time-token",
      new_password: "StrongExamplePassword!",
    });
  });

  it("does not submit without both invitation token values", () => {
    renderPasswordSetup("/set-password?uid=encoded-user-id");

    expect(
      screen.getByText(/This password setup link is invalid or expired/),
    ).toBeVisible();
    expect(setupTenantPassword).not.toHaveBeenCalled();
  });
});
