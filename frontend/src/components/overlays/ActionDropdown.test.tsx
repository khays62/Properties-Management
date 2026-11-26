import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionDropdown } from "./ActionDropdown";

afterEach(cleanup);

describe("ActionDropdown", () => {
  it("portals the menu outside overflowing containers and supports keyboard navigation", async () => {
    const user = userEvent.setup();

    render(
      <div data-testid="table-container" className="overflow-hidden">
        <ActionDropdown
          label="Property actions"
          items={[
            { id: "view", label: "View property", onSelect: vi.fn() },
            { id: "edit", label: "Edit property", onSelect: vi.fn() },
          ]}
        />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Property actions" }));

    const menu = await screen.findByRole("menu", { name: "Property actions" });
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveClass("fixed");

    const viewAction = screen.getByRole("menuitem", { name: "View property" });
    const editAction = screen.getByRole("menuitem", { name: "Edit property" });
    expect(viewAction).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(editAction).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Property actions" }),
    ).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows a tooltip explanation without expanding the disabled menu item", async () => {
    const user = userEvent.setup();

    render(
      <ActionDropdown
        items={[
          {
            id: "archive",
            label: "Archive property",
            onSelect: vi.fn(),
            disabled: true,
            disabledReason: "This property still has units.",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    const archiveItem = screen.getByRole("menuitem", {
      name: "Archive property. This property still has units.",
    });
    expect(archiveItem).toBeDisabled();
    expect(archiveItem).toHaveAttribute(
      "title",
      "This property still has units.",
    );
    expect(
      screen.queryByText("This property still has units."),
    ).not.toBeInTheDocument();
  });
});
