import type { HTMLAttributes, ReactNode } from "react";

export type AlertVariant = "success" | "info" | "warning" | "danger";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  success: "border-success/30 bg-success/10 text-success",
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
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
