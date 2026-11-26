import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button, type ButtonVariant } from "../../../components/ui/Button";
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
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  async function handleAction() {
    setBusy(true);
    setError(null);
    setComplete(false);
    try {
      await onAction();
      await queryClient.invalidateQueries({ queryKey: ["workflow"] });
      setComplete(true);
    } catch (actionError) {
      setError(getWorkflowErrorMessage(actionError));
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
      {complete && (
        <span className="text-xs text-success" role="status">
          Completed.
        </span>
      )}
      {error && (
        <span className="max-w-56 text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
