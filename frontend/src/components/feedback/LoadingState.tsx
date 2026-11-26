import type { HTMLAttributes, ReactNode } from "react";

import { LoadingSpinner } from "./LoadingSpinner";

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  message?: ReactNode;
}

export function LoadingState({
  className,
  label = "Loading",
  message,
  ...props
}: LoadingStateProps) {
  return (
    <div
      {...props}
      className={["flex flex-col items-center gap-3 py-12 text-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      <LoadingSpinner label={label} />
      {message && <p className="text-sm text-text-secondary">{message}</p>}
    </div>
  );
}
