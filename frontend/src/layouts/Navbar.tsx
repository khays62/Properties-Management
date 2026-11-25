import type { Ref } from "react";

import { Button } from "../components/ui/Button";
import { AppLogo } from "./AppLogo";

export interface NavbarProps {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
  desktopToggleRef?: Ref<HTMLButtonElement>;
  mobileToggleRef?: Ref<HTMLButtonElement>;
  className?: string;
}

export function Navbar({
  className,
  desktopToggleRef,
  mobileSidebarOpen,
  mobileToggleRef,
  onToggleMobileSidebar,
  onToggleSidebar,
  sidebarCollapsed,
}: NavbarProps) {
  return (
    <header
      className={[
        "sticky top-0 z-[var(--z-index-sticky)] flex h-[var(--header-height)] items-center justify-between border-b border-slate-200 bg-card px-4 shadow-sm sm:px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          ref={desktopToggleRef}
          variant="ghost"
          size="sm"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="app-desktop-sidebar"
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 min-h-0 p-0 text-text-secondary lg:inline-flex"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d={
                sidebarCollapsed
                  ? "m7 4 6 6-6 6"
                  : "m13 4-6 6 6 6"
              }
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </Button>
        <Button
          ref={mobileToggleRef}
          type="button"
          variant="ghost"
          size="sm"
          aria-label={mobileSidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileSidebarOpen}
          aria-controls="app-mobile-sidebar"
          onClick={onToggleMobileSidebar}
          className="h-10 w-10 min-h-0 p-0 text-text-secondary lg:hidden"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </Button>
        <AppLogo variant="navbar" className="lg:hidden" />
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div
          role="img"
          aria-label="Notifications placeholder"
          className="grid h-10 w-10 place-items-center rounded-full text-text-secondary"
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
        </div>
        <div
          role="img"
          aria-label="Profile placeholder"
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-full bg-background text-xs font-semibold text-text-secondary"
          >
            OP
          </span>
          <span className="hidden text-sm font-medium text-text-primary sm:block">
            Profile
          </span>
        </div>
      </div>
    </header>
  );
}
