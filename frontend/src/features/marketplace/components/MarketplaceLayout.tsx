import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import { AppLogo } from "../../../layouts/AppLogo";

export function MarketplaceLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="op-marketplace min-h-screen bg-background">
      <header className="border-b border-[var(--color-border)] bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            aria-label="OmniProperties home"
            className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            <AppLogo variant="navbar" />
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/listings"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"}`
              }
            >
              Listings
            </NavLink>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="op-button op-button--primary"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[var(--color-border)] bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-text-secondary sm:px-6 lg:px-8">
          OmniProperties by OmniTeckno
        </div>
      </footer>
    </div>
  );
}
