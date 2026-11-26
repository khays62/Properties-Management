import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import {
  ContentContainer,
  type ContentMaxWidth,
  type ContentPadding,
} from "./ContentContainer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { DEFAULT_SIDEBAR_ITEMS } from "./sidebarItems";
import { useAuth } from "../hooks/useAuth";

export interface AppShellProps {
  children: ReactNode;
  maxContentWidth?: ContentMaxWidth;
  contentPadding?: ContentPadding;
  className?: string;
}

export function AppShell({
  children,
  className,
  contentPadding,
  maxContentWidth,
}: AppShellProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      window.localStorage.getItem("omniproperties.sidebar.collapsed") ===
      "true",
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    window.localStorage.setItem(
      "omniproperties.sidebar.collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };

    desktopMedia.addEventListener("change", closeOnDesktop);
    return () => desktopMedia.removeEventListener("change", closeOnDesktop);
  }, [mobileSidebarOpen]);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((open) => !open);
  }, []);
  const canManageProperties =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const navigation = DEFAULT_SIDEBAR_ITEMS.filter(
    (item) =>
      item.id === "dashboard" ||
      (item.id === "properties" && canManageProperties),
  ).map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  return (
    <div
      className={[
        "min-h-screen bg-background transition-[padding-left] duration-200 motion-reduce:transition-none",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-[var(--sidebar-width)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        onToggleCollapsed={() =>
          setSidebarCollapsed((collapsed) => !collapsed)
        }
        items={navigation}
        returnFocusRef={mobileToggleRef}
      />
      <Navbar
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={toggleMobileSidebar}
        mobileToggleRef={mobileToggleRef}
      />
      <main
        aria-hidden={mobileSidebarOpen || undefined}
        className="min-w-0"
      >
        <ContentContainer
          maxWidth={maxContentWidth}
          padding={contentPadding}
        >
          {children}
        </ContentContainer>
      </main>
    </div>
  );
}
