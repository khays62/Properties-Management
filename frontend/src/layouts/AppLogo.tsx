import { brandLogo } from "../constants/theme";

export type AppLogoVariant = "expanded" | "collapsed" | "navbar";

export interface AppLogoProps {
  variant?: AppLogoVariant;
  className?: string;
}

export function AppLogo({
  className,
  variant = "expanded",
}: AppLogoProps) {
  if (variant === "collapsed") {
    return (
      <span
        className={[
          "relative block h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <img
          src={brandLogo}
          alt="OmniTeckno logo mark"
          className="absolute left-[-0.5rem] top-[-2.5rem] h-[7.5rem] w-[7.5rem] max-w-none"
        />
      </span>
    );
  }

  const sizeClass =
    variant === "navbar" ? "h-10 w-36" : "h-14 w-48";

  return (
    <span
      className={[
        "block shrink-0 overflow-hidden rounded-md bg-black",
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        src={brandLogo}
        alt="OmniTeckno"
        className="h-full w-full object-cover object-center"
      />
    </span>
  );
}
