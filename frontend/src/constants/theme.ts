import brandLogo from "../assets/logo.jpeg";

export const brandColors = {
  primary: "#18A4EA",
  primaryHover: "#1290CF",
  primaryLight: "#E6F7FF",
  sidebar: "#0B1220",
  textPrimary: "#111827",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#0284C7",
  neutral: "#64748B",
} as const;

export { brandLogo };

export const theme = {
  colors: brandColors,
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
  layout: {
    contentMaxWidth: "80rem",
    containerSpacing: "clamp(1rem, 3vw, 2rem)",
    pageSpacing: "clamp(1.25rem, 4vw, 2.5rem)",
    sidebarWidth: "16rem",
    headerHeight: "4rem",
  },
} as const;
