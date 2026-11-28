/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        "omni-blue": "var(--brand-primary)",
        "omni-blue-dark": "var(--brand-primary-hover)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-subtle": "var(--color-primary-subtle)",
        "sidebar-dark": "var(--color-sidebar)",
        success: "var(--color-success)",
        "success-subtle": "var(--color-success-subtle)",
        warning: "var(--color-warning)",
        "warning-subtle": "var(--color-warning-subtle)",
        danger: "var(--color-danger)",
        "danger-subtle": "var(--color-danger-subtle)",
        info: "var(--color-info)",
        "info-subtle": "var(--color-info-subtle)",
        neutral: "var(--color-neutral)",
        "neutral-subtle": "var(--color-neutral-subtle)",
        background: "var(--color-background)",
        card: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
      },
    },
  },
  plugins: [],
};
