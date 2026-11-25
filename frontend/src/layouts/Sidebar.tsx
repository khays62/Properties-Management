import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { AppLogo } from "./AppLogo";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  items?: readonly SidebarItem[];
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
}

const DEFAULT_ITEMS: readonly SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    id: "properties",
    label: "Properties",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="m3.5 10 8.5-6 8.5 6v10h-6v-6h-5v6h-6z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    id: "listings",
    label: "Listings",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M5 6h14M5 12h14M5 18h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <circle cx="3" cy="6" r=".75" fill="currentColor" />
        <circle cx="3" cy="12" r=".75" fill="currentColor" />
        <circle cx="3" cy="18" r=".75" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "finance",
    label: "Finance",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.5 10h17m-4.5 4h2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
];

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
                <a
                  href={item.href}
                  title={title}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => {
                    item.onClick?.();
                    onNavigate?.();
                  }}
                  className={itemClassName}
                >
                  {content}
                </a>
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
  items = DEFAULT_ITEMS,
  mobileOpen,
  onClose,
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
          "hidden h-[calc(100vh-var(--header-height))] shrink-0 flex-col border-r border-white/10 bg-sidebar-dark text-white transition-[width] duration-200 lg:sticky lg:top-[var(--header-height)] lg:flex",
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
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close navigation"
            onClick={onClose}
            className="fixed inset-x-0 bottom-0 top-[var(--header-height)] z-[var(--z-index-overlay)] bg-black/50 lg:hidden"
          />
          <aside
            ref={drawerRef}
            id="app-mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={[
              "fixed bottom-0 left-0 top-[var(--header-height)] z-[var(--z-index-modal)] flex w-[var(--sidebar-width)] max-w-[85vw] flex-col bg-sidebar-dark text-white shadow-xl lg:hidden",
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
