import brandLogo from "../assets/logo.jpeg";

export const brandColors = {
  primary: "var(--color-primary)",
  primaryHover: "var(--color-primary-hover)",
  primaryLight: "var(--color-primary-light)",
  accent: "var(--color-accent)",
  secondary: "var(--color-secondary)",
  sidebar: "var(--color-sidebar)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  background: "var(--color-background)",
  surface: "var(--color-surface)",
  surfaceMuted: "var(--color-surface-muted)",
  border: "var(--color-border)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
  neutral: "var(--color-neutral)",
} as const;

export { brandLogo };

export const theme = {
  colors: brandColors,
  typography: {
    fontFamily: "var(--font-family-sans)",
    scale: {
      display: "var(--font-size-display)",
      pageTitle: "var(--font-size-3xl)",
      sectionTitle: "var(--font-size-xl)",
      body: "var(--font-size-md)",
      caption: "var(--font-size-xs)",
      tableText: "var(--font-size-sm)",
    },
  },
  layout: {
    contentMaxWidth: "var(--content-max-width)",
    containerSpacing: "var(--container-spacing)",
    pageSpacing: "var(--page-spacing)",
    sidebarWidth: "var(--sidebar-width)",
    headerHeight: "var(--header-height)",
  },
} as const;
