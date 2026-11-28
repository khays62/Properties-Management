import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "../../../services/apiError";
import { CreateEditModal } from "../../../components/overlays/CreateEditModal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import type { TeamInvitationCreateInput } from "../types/team";

const invitationFormSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  first_name: z.string().max(150, "Use 150 characters or fewer."),
  last_name: z.string().max(150, "Use 150 characters or fewer."),
  role: z.enum(["PROPERTY_MANAGER", "ACCOUNTANT"]),
});

type InvitationFormValues = z.infer<typeof invitationFormSchema>;

interface TeamInvitationFormModalProps {
  open: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: TeamInvitationCreateInput) => Promise<void>;
}

export function TeamInvitationFormModal({
  isSaving,
  onClose,
  onSubmit,
  open,
}: TeamInvitationFormModalProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      role: "PROPERTY_MANAGER",
    },
  });

  function closeModal() {
    reset({
      email: "",
      first_name: "",
      last_name: "",
      role: "PROPERTY_MANAGER",
    });
    setSubmissionError(null);
    onClose();
  }

  async function submit(values: InvitationFormValues) {
    setSubmissionError(null);
    try {
      await onSubmit(values);
      closeModal();
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error));
    }
  }

  return (
    <CreateEditModal
      open={open}
      mode="create"
      entityName="team invitation"
      title="Invite team member"
      submitLabel="Send invitation"
      description="Invite a Property Manager or Accountant to join your team."
      onClose={closeModal}
      onSubmit={handleSubmit((values) => void submit(values))}
      isSubmitting={isSubmitting || isSaving}
      error={submissionError}
    >
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register("email")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          autoComplete="given-name"
          error={errors.first_name?.message}
          {...register("first_name")}
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          error={errors.last_name?.message}
          {...register("last_name")}
        />
      </div>
      <Select
        label="Role"
        required
        error={errors.role?.message}
        {...register("role")}
      >
        <option value="PROPERTY_MANAGER">Property Manager</option>
        <option value="ACCOUNTANT">Accountant</option>
      </Select>
    </CreateEditModal>
  );
}
