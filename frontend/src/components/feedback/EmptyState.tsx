import { useId, type ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
}: EmptyStateProps) {
  const titleId = useId();

  return (
    <section
      className={["op-empty-state", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      {icon && (
        <div className="op-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="op-empty-state__title" id={titleId}>
        {title}
      </h2>
      {description && (
        <div className="op-empty-state__description">{description}</div>
      )}
      {action}
    </section>
  );
}
