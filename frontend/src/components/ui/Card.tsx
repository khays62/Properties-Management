import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={["op-card", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
