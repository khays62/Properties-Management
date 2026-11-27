import { NavLink } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";

interface FinanceSection {
  to: string;
  label: string;
  managerOnly?: boolean;
}

const SECTIONS: FinanceSection[] = [
  { to: "/finance/charges", label: "Charges" },
  { to: "/finance/rent-schedules", label: "Rent Schedules", managerOnly: true },
  { to: "/finance/deposits", label: "Deposits" },
  { to: "/finance/payments", label: "Payments" },
  { to: "/finance/receipts", label: "Receipts" },
];

export function FinanceNavigation() {
  const { user } = useAuth();
  const canManageSchedules = [
    "OWNER",
    "PROPERTY_MANAGER",
    "ACCOUNTANT",
  ].includes(user?.role ?? "");

  return (
    <nav aria-label="Finance sections" className="border-b border-[var(--color-border)]">
      <ul className="flex flex-wrap gap-2">
        {SECTIONS.filter(
          (section) => !section.managerOnly || canManageSchedules,
        ).map((section) => (
          <li key={section.to}>
            <NavLink
              to={section.to}
              className={({ isActive }) =>
                [
                  "inline-flex min-h-10 items-center rounded-t-md border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue",
                  isActive
                    ? "border-omni-blue text-omni-blue"
                    : "border-transparent text-text-secondary hover:text-text-primary",
                ].join(" ")
              }
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
