import type { HTMLAttributes, ReactNode } from "react";

export type AlertVariant = "success" | "info" | "warning" | "danger";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  success: "border-success-subtle bg-success-subtle text-success",
  info: "border-info-subtle bg-info-subtle text-info",
  warning: "border-warning-subtle bg-warning-subtle text-warning",
  danger: "border-danger-subtle bg-danger-subtle text-danger",
};

export function Alert({
  children,
  className,
  title,
  variant = "info",
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-lg border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
