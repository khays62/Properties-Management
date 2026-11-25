import { useId, type ReactNode } from "react";

import { Button } from "../ui/Button";

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  className,
  description = "Something went wrong. Please try again.",
  onRetry,
  retryLabel = "Try again",
  title = "Unable to load",
}: ErrorStateProps) {
  const titleId = useId();

  return (
    <section
      className={["op-error-state", className].filter(Boolean).join(" ")}
      role="alert"
      aria-labelledby={titleId}
    >
      <h2 className="op-error-state__title" id={titleId}>
        {title}
      </h2>
      <div className="op-error-state__description">{description}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </section>
  );
}
