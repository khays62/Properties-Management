import type { ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export const DEFAULT_SIDEBAR_ITEMS: readonly SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
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
    href: "/properties",
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
    href: "/listings",
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
    href: "/finance",
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
