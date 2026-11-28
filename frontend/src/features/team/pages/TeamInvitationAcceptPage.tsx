import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Alert } from "../../../components/feedback/Alert";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { getApiErrorMessage } from "../../../services/apiError";
import { usePageMetadata } from "../../../hooks/usePageMetadata";
import { AppLogo } from "../../../layouts/AppLogo";
import { useAcceptTeamInvitation } from "../hooks/useTeam";

const acceptInvitationSchema = z
  .object({
    new_password: z.string().min(1, "Enter a password."),
    confirm_password: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

export function TeamInvitationAcceptPage() {
  usePageMetadata(
    "Accept team invitation | OmniProperties",
    "Set up your OmniProperties team account.",
  );
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitation = searchParams.get("invitation") ?? "";
  const token = searchParams.get("token") ?? "";
  const acceptMutation = useAcceptTeamInvitation();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  async function submit(values: AcceptInvitationFormValues) {
    if (!invitation || !token) {
      setSubmissionError(
        "This invitation link is invalid or expired. Contact the team owner for a new invitation.",
      );
      return;
    }
    setSubmissionError(null);
    try {
      await acceptMutation.mutateAsync({
        invitation,
        token,
        new_password: values.new_password,
      });
      navigate("/login", {
        replace: true,
        state: { teamInvitationAccepted: true },
      });
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error));
    }
  }

  const missingToken = !invitation || !token;

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
              Accept your team invitation
            </h1>
            <p className="text-sm text-text-secondary">
              Choose a password to finish setting up your staff account.
            </p>
          </div>
          {missingToken ? (
            <Alert variant="danger">
              This invitation link is invalid or expired. Contact the team
              owner for a new invitation.
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
                isLoading={isSubmitting || acceptMutation.isPending}
                className="w-full"
              >
                Accept invitation
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
