import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={6_000}
      style={{ zIndex: "var(--z-index-toast)" }}
    />
  );
}
