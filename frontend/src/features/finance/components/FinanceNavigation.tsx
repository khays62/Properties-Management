import { NavLink } from "react-router-dom";

const SECTIONS = [
  { to: "/finance/charges", label: "Charges" },
  { to: "/finance/deposits", label: "Deposits" },
  { to: "/finance/payments", label: "Payments" },
  { to: "/finance/receipts", label: "Receipts" },
] as const;

export function FinanceNavigation() {
  return (
    <nav aria-label="Finance sections" className="border-b border-[var(--color-border)]">
      <ul className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
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
