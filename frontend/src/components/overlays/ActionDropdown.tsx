import { useId, useRef, useState, type ReactNode } from "react";

import { Button, type ButtonVariant } from "../ui/Button";

export interface ActionDropdownItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export interface ActionDropdownProps {
  label?: string;
  items: readonly ActionDropdownItem[];
  className?: string;
}

export function ActionDropdown({
  className,
  items,
  label = "Actions",
}: ActionDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <details
      ref={detailsRef}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={["relative inline-block text-left", className]
        .filter(Boolean)
        .join(" ")}
    >
      <summary
        role="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        className="op-button op-button--secondary op-button--sm list-none [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">⋯</span>
      </summary>
      <div
        id={menuId}
        aria-label={label}
        className="absolute right-0 z-30 mt-2 min-w-48 rounded-lg border border-[var(--color-border)] bg-card p-1 shadow-lg"
      >
        {items.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={item.variant ?? "ghost"}
            size="sm"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className="w-full justify-start gap-2 text-left"
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    </details>
  );
}
