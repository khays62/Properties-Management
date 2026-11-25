import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ContentContainer, type ContentMaxWidth, type ContentPadding } from "./ContentContainer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const desktopToggleRef = useRef<HTMLButtonElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        window.requestAnimationFrame(() => desktopToggleRef.current?.focus());
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

  return (
    <div className={["min-h-screen bg-background", className].filter(Boolean).join(" ")}>
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onToggleMobileSidebar={toggleMobileSidebar}
        desktopToggleRef={desktopToggleRef}
        mobileToggleRef={mobileToggleRef}
      />
      <div className="flex min-h-[calc(100vh-var(--header-height))]">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onClose={closeMobileSidebar}
          returnFocusRef={mobileToggleRef}
        />
        <main
          aria-hidden={mobileSidebarOpen || undefined}
          className="min-w-0 flex-1"
        >
          <ContentContainer
            maxWidth={maxContentWidth}
            padding={contentPadding}
          >
            {children}
          </ContentContainer>
        </main>
      </div>
    </div>
  );
}
