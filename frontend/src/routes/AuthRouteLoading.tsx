import { LoadingSpinner } from "../components/feedback/LoadingSpinner";

export function AuthRouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <LoadingSpinner label="Checking your session" />
    </main>
  );
}
