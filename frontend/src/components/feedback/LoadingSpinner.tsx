import type { HTMLAttributes } from "react";

export interface LoadingSpinnerProps
  extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  className,
  label = "Loading",
  size = "md",
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      {...props}
      className={[
        "op-spinner",
        `op-spinner--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={label}
    >
      <span className="op-spinner__circle" aria-hidden="true" />
      <span className="op-visually-hidden">{label}</span>
    </div>
  );
}
