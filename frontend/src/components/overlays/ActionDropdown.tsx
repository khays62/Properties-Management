import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Button, type ButtonVariant } from "../ui/Button";

export interface ActionDropdownItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export interface ActionDropdownProps {
  label?: string;
  items: readonly ActionDropdownItem[];
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
}

export function ActionDropdown({
  className,
  items,
  label = "Actions",
}: ActionDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasFocusedMenuItem = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuId = useId();

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const anchor = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const margin = 8;
      const left = Math.max(
        margin,
        Math.min(
          anchor.right - menuRect.width,
          window.innerWidth - menuRect.width - margin,
        ),
      );
      const below = anchor.bottom + margin;
      const top =
        below + menuRect.height <= window.innerHeight - margin
          ? below
          : Math.max(margin, anchor.top - menuRect.height - margin);

      setPosition({ top, left });
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    }

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) {
      hasFocusedMenuItem.current = false;
      return;
    }
    if (!position || hasFocusedMenuItem.current) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
    hasFocusedMenuItem.current = true;
  }, [open, position]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ),
    );
    if (menuItems.length === 0) return;

    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    } else if (event.key === "Tab") {
      closeMenu();
    }
  }

  return (
    <div className={["inline-block text-left", className].filter(Boolean).join(" ")}>
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        size="sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setPosition(null);
          setOpen((isOpen) => !isOpen);
        }}
      >
        <span aria-hidden="true">⋯</span>
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            className="fixed z-[var(--z-index-overlay)] max-h-[calc(100vh-1rem)] min-w-48 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-card p-1 shadow-lg"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {items.map((item) => (
              <Button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                variant={item.disabled ? "ghost" : item.variant ?? "ghost"}
                size="sm"
                disabled={item.disabled}
                title={item.disabledReason}
                aria-label={
                  item.disabledReason
                    ? `${item.label}. ${item.disabledReason}`
                    : undefined
                }
                onClick={() => {
                  item.onSelect();
                  closeMenu();
                }}
                className="w-full justify-start gap-2 text-left"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
