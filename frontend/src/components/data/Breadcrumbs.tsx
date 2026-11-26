import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  label?: string;
  className?: string;
}

export function Breadcrumbs({
  className,
  items,
  label = "Breadcrumb",
}: BreadcrumbsProps) {
  const explicitCurrentIndex = items.findIndex((item) => item.current);
  const currentIndex =
    explicitCurrentIndex >= 0 ? explicitCurrentIndex : items.length - 1;

  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-text-secondary"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="m6 3 5 5-5 5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
              {isCurrent ? (
                <span aria-current="page" className="font-medium text-text-primary">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="rounded-sm hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
                >
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="rounded-sm hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
