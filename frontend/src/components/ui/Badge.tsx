import type { HTMLAttributes } from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export function Badge({
  className,
  size = "sm",
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        "op-badge",
        `op-badge--${variant}`,
        `op-badge--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
