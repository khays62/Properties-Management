import { useEffect, useRef, type RefObject } from "react";
import { Link } from "react-router-dom";

import { AppLogo } from "./AppLogo";
import { DEFAULT_SIDEBAR_ITEMS, type SidebarItem } from "./sidebarItems";

export interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
  items?: readonly SidebarItem[];
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
}

function SidebarNavigation({
  collapsed,
  items,
  onNavigate,
}: {
  collapsed: boolean;
  items: readonly SidebarItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const itemClassName = [
            "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            item.active
              ? "bg-white/10 text-white"
              : "text-white/75 hover:bg-white/10 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue",
          ].join(" ");
          const content = (
            <>
              {item.icon && (
                <span
                  aria-hidden="true"
                  className="grid h-5 w-5 shrink-0 place-items-center [&>svg]:h-5 [&>svg]:w-5"
                >
                  {item.icon}
                </span>
              )}
              <span className={collapsed ? "sr-only" : "truncate"}>
                {item.label}
              </span>
            </>
          );
          const title = collapsed ? item.label : undefined;

          return (
            <li key={item.id}>
              {item.href && !item.disabled ? (
                <Link
                  to={item.href}
                  title={title}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => {
                    item.onClick?.();
                    onNavigate?.();
                  }}
                  className={itemClassName}
                >
                  {content}
                </Link>
              ) : item.onClick && !item.disabled ? (
                <button
                  type="button"
                  title={title}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => {
                    item.onClick?.();
                    onNavigate?.();
                  }}
                  className={`${itemClassName} w-full text-left`}
                >
                  {content}
                </button>
              ) : (
                <span
                  title={title}
                  aria-disabled="true"
                  className={`${itemClassName} cursor-default text-white/55`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({
  className,
  collapsed,
  items = DEFAULT_SIDEBAR_ITEMS,
  mobileOpen,
  onClose,
  onToggleCollapsed,
  returnFocusRef,
}: SidebarProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!mobileOpen) {
      if (wasOpen.current) {
        returnFocusRef?.current?.focus();
        wasOpen.current = false;
      }
      return;
    }

    wasOpen.current = true;
    closeButtonRef.current?.focus();
    const drawer = drawerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, onClose, returnFocusRef]);

  return (
    <>
      <aside
        id="app-desktop-sidebar"
        aria-label="Primary sidebar"
        className={[
          "fixed inset-y-0 left-0 z-[var(--z-index-dropdown)] hidden h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar-dark text-white transition-[width] duration-200 motion-reduce:transition-none lg:flex",
          collapsed ? "w-20" : "w-[var(--sidebar-width)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "flex h-16 shrink-0 items-center",
            collapsed ? "justify-center px-2" : "px-4",
          ].join(" ")}
        >
          <AppLogo variant={collapsed ? "collapsed" : "expanded"} />
        </div>
        <SidebarNavigation collapsed={collapsed} items={items} />
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="app-desktop-sidebar"
            onClick={onToggleCollapsed}
            className={[
              "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue",
              collapsed ? "justify-center px-2" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d={collapsed ? "m7 4 6 6-6 6" : "m13 4-6 6 6 6"}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
            <span className={collapsed ? "sr-only" : "truncate"}>
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close navigation"
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-index-overlay)] bg-black/50 lg:hidden"
          />
          <aside
            ref={drawerRef}
            id="app-mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={[
              "fixed inset-y-0 left-0 z-[var(--z-index-modal)] flex w-[var(--sidebar-width)] max-w-[85vw] flex-col bg-sidebar-dark text-white shadow-xl lg:hidden",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <AppLogo variant="expanded" />
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close navigation menu"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="m5 5 10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </button>
            </div>
            <SidebarNavigation
              collapsed={false}
              items={items}
              onNavigate={onClose}
            />
          </aside>
        </>
      )}
    </>
  );
}
