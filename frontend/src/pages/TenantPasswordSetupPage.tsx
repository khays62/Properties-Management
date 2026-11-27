import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { usePageMetadata } from "../hooks/usePageMetadata";
import { AppLogo } from "../layouts/AppLogo";
import { Alert } from "../components/feedback/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  getAuthErrorMessage,
  setupTenantPassword,
} from "../services/auth.api";

const passwordSetupSchema = z
  .object({
    new_password: z.string().min(1, "Enter a password."),
    confirm_password: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

type PasswordSetupFormValues = z.infer<typeof passwordSetupSchema>;

export function TenantPasswordSetupPage() {
  usePageMetadata(
    "Set up tenant password | OmniProperties",
    "Finish setting up your OmniProperties tenant account.",
  );
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordSetupFormValues>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  async function submit(values: PasswordSetupFormValues) {
    if (!uid || !token) {
      setSubmissionError(
        "This password setup link is invalid or expired. Contact the property team for a new link.",
      );
      return;
    }

    setSubmissionError(null);
    try {
      await setupTenantPassword({
        uid,
        token,
        new_password: values.new_password,
      });
      navigate("/login", {
        replace: true,
        state: { passwordSetupSuccess: true },
      });
    } catch (error) {
      setSubmissionError(getAuthErrorMessage(error));
    }
  }

  const missingToken = !uid || !token;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="OmniProperties home">
            <AppLogo variant="navbar" />
          </Link>
        </div>
        <Card className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Set up your tenant password
            </h1>
            <p className="text-sm text-text-secondary">
              Choose a password to finish setting up your OmniProperties
              account.
            </p>
          </div>

          {missingToken ? (
            <Alert variant="danger">
              This password setup link is invalid or expired. Contact the
              property team for a new link.
            </Alert>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit((values) => void submit(values))}
              className="space-y-4"
            >
              {submissionError && (
                <Alert variant="danger" role="alert">
                  {submissionError}
                </Alert>
              )}
              <Input
                label="New password"
                required
                type="password"
                autoComplete="new-password"
                error={errors.new_password?.message}
                {...register("new_password")}
              />
              <Input
                label="Confirm password"
                required
                type="password"
                autoComplete="new-password"
                error={errors.confirm_password?.message}
                {...register("confirm_password")}
              />
              <p className="text-sm text-text-secondary">
                Your password must meet the account security requirements.
              </p>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full"
              >
                Set password
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="block text-center text-sm font-medium text-omni-blue hover:underline"
          >
            Return to sign in
          </Link>
        </Card>
      </div>
    </main>
  );
}
