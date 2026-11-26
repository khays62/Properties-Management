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
    id: "units",
    label: "Units",
    href: "/units",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M4 20V4h16v16H4Zm0-8h16M12 4v16"
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
    id: "applications",
    label: "Applications",
    href: "/applications",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Zm2 5h6m-6 4h6m-6 4h3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    id: "leases",
    label: "Leases",
    href: "/leases",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7 3.75h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5.25a1.5 1.5 0 0 1 1-1.5Zm7 0v4h4m-8 4h6m-6 4h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    icon: (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M14.2 6.1a4.2 4.2 0 0 0-5.7 5.7L4 16.3a2.1 2.1 0 1 0 3 3l4.5-4.5a4.2 4.2 0 0 0 5.7-5.7l-2.7 2.7-3-3 2.7-2.7Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance/charges",
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
