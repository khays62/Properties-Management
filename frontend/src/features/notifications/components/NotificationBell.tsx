import { useEffect, useRef, useState } from "react";

import { useUnreadNotificationCount } from "../hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const unreadCountQuery = useUnreadNotificationCount();
  const unreadCount = unreadCountQuery.data ?? 0;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !wrapperRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const label = unreadCountQuery.isError
    ? "Notifications (unread count unavailable)"
    : `Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "notification-dropdown" : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-text-secondary hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            d="M15 7a5 5 0 0 0-10 0c0 5-2 5-2 6.5h14C17 12 15 12 15 7Zm-7 9h4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {unreadCountQuery.isError && (
          <span
            aria-hidden="true"
            title="Unread count unavailable"
            className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-danger"
          />
        )}
      </button>
      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
