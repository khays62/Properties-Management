import type { ReactNode } from "react";

export interface PageTitleProps {
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

export function PageTitle({
  className,
  subtitle,
  title,
}: PageTitleProps) {
  return (
    <div className={className}>
      <h1 className="op-page-title text-text-primary">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-text-secondary sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
