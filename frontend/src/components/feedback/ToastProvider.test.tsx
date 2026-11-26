import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { toastService } from "../../services/toastService";
import { ToastProvider } from "./ToastProvider";

afterEach(cleanup);

describe("ToastProvider", () => {
  it("announces service notifications to the user", async () => {
    render(<ToastProvider />);
    toastService.success("Property created.");

    expect(await screen.findByText("Property created.")).toBeVisible();
  });
});
