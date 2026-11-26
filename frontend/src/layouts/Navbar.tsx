import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
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
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;

    profileMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      ?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !profileAreaRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  function handleProfileMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    logout();
    queryClient.clear();
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

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
        <div ref={profileAreaRef} className="relative">
          <button
            ref={profileButtonRef}
            type="button"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            aria-controls="navbar-profile-menu"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex min-h-10 items-center gap-2 rounded-md px-2 text-left hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
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
            <svg
              aria-hidden="true"
              className="hidden h-4 w-4 text-text-secondary sm:block"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          {profileMenuOpen && (
            <div
              ref={profileMenuRef}
              id="navbar-profile-menu"
              role="menu"
              aria-label="Profile"
              onKeyDown={handleProfileMenuKeyDown}
              className="absolute right-0 top-full z-[var(--z-index-dropdown)] mt-2 w-48 rounded-lg border border-slate-200 bg-card p-1.5 shadow-lg"
            >
              <div
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="rounded-md px-3 py-2 text-sm text-text-secondary"
              >
                Profile
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-danger hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
