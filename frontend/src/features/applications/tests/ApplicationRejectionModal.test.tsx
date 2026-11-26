import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationRejectionModal } from "../components/ApplicationRejectionModal";

afterEach(cleanup);

describe("ApplicationRejectionModal", () => {
  it("requires a nonblank reason and submits the trimmed value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(reason: string) => void>();

    render(
      <ApplicationRejectionModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );
    expect(
      await screen.findByText("Enter a reason for rejecting this application."),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText("Rejection reason"),
      "  Screening requirements were not met.  ",
    );
    await user.click(
      screen.getByRole("button", { name: "Reject application" }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "Screening requirements were not met.",
      );
    });
  });
});
