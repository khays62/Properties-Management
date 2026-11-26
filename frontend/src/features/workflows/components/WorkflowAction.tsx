import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button, type ButtonVariant } from "../../../components/ui/Button";
import { toastService } from "../../../services/toastService";
import { getWorkflowErrorMessage } from "../api";

export interface WorkflowActionProps {
  label: string;
  onAction: () => Promise<unknown>;
  variant?: ButtonVariant;
}

export function WorkflowAction({
  label,
  onAction,
  variant = "secondary",
}: WorkflowActionProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleAction() {
    setBusy(true);
    try {
      await onAction();
      await queryClient.invalidateQueries({ queryKey: ["workflow"] });
      toastService.success(`${label} completed.`);
    } catch (actionError) {
      toastService.error(getWorkflowErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        isLoading={busy}
        onClick={() => void handleAction()}
      >
        {label}
      </Button>
    </span>
  );
}
