import brandLogo from "../assets/logo.jpeg";

export const brandColors = {
  primary: "#18A4EA",
  primaryHover: "#1290CF",
  primaryLight: "#E6F7FF",
  secondary: "#0B1220",
  sidebar: "#0B1220",
  textPrimary: "#111827",
  textMuted: "#64748B",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  border: "#E2E8F0",
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
    scale: {
      display: "3.75rem",
      pageTitle: "1.875rem",
      sectionTitle: "1.25rem",
      body: "1rem",
      caption: "0.75rem",
      tableText: "0.875rem",
    },
  },
  layout: {
    contentMaxWidth: "80rem",
    containerSpacing: "clamp(1rem, 3vw, 2rem)",
    pageSpacing: "clamp(1.25rem, 4vw, 2.5rem)",
    sidebarWidth: "16rem",
    headerHeight: "4rem",
  },
} as const;
