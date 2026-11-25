import type { ReactNode } from "react";

export type ContentMaxWidth =
  | "content"
  | "full"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl";

export type ContentPadding = "none" | "compact" | "page";

export interface ContentContainerProps {
  children: ReactNode;
  maxWidth?: ContentMaxWidth;
  padding?: ContentPadding;
  className?: string;
}

const maxWidthClasses: Record<ContentMaxWidth, string> = {
  content: "max-w-[var(--content-max-width)]",
  full: "max-w-none",
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
};

const paddingClasses: Record<ContentPadding, string> = {
  none: "px-0 py-0",
  compact: "px-4 py-4 sm:px-6 sm:py-6",
  page: "px-[var(--container-spacing)] py-[var(--page-spacing)]",
};

export function ContentContainer({
  children,
  className,
  maxWidth = "content",
  padding = "page",
}: ContentContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
