import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../hooks/useAuth";
import { AppLogo } from "../layouts/AppLogo";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { getSafeRedirectPath } from "../routes/routeState";
import { getAuthErrorMessage } from "../services/auth.api";
import type { LoginCredentials } from "../types/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginPage() {
  const { error: authError, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function submitLogin(credentials: LoginCredentials) {
    setSubmitError(null);
    try {
      await login(credentials);
      navigate(getSafeRedirectPath(location.state), { replace: true });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <AppLogo variant="navbar" />
        </div>
        <Card className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Sign in to OmniProperties
            </h1>
            <p className="text-sm text-text-secondary">
              Enter your account credentials to continue.
            </p>
          </div>

          {(submitError || authError) && (
            <p
              role="alert"
              className="rounded-md border border-danger bg-card px-3 py-2 text-sm text-danger"
            >
              {submitError ?? authError}
            </p>
          )}

          <form
            noValidate
            onSubmit={handleSubmit(submitLogin)}
            className="space-y-4"
          >
            <Input
              {...register("email")}
              id="login-email"
              type="email"
              label="Email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.email?.message}
              aria-required="true"
            />
            <Input
              {...register("password")}
              id="login-password"
              type="password"
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              aria-required="true"
            />
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
