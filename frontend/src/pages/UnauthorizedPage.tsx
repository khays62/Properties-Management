import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";
import { AppLogo } from "../layouts/AppLogo";

export function UnauthorizedPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <AppLogo variant="navbar" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Access unavailable
          </h1>
          <p className="text-sm text-text-secondary">
            Your account does not have an authorized role for this area
            {user?.role ? ` (${user.role})` : ""}.
          </p>
        </div>
        <Button type="button" onClick={signOut} className="w-full">
          Sign out
        </Button>
      </Card>
    </main>
  );
}
