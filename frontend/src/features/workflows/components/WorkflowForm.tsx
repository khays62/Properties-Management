import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Textarea } from "../../../components/ui/Textarea";
import { toastService } from "../../../services/toastService";
import { getWorkflowErrorMessage, type WorkflowOption } from "../api";

export interface WorkflowField {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  step?: string;
  options?: readonly WorkflowOption[];
}

export interface WorkflowFormProps {
  title: string;
  fields: readonly WorkflowField[];
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  submitLabel?: string;
  className?: string;
}

export function WorkflowForm({
  className,
  fields,
  onSubmit,
  submitLabel = "Save",
  title,
}: WorkflowFormProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(
      fields.map((field) => [field.name, String(formData.get(field.name) ?? "")]),
    );

    try {
      await onSubmit(values);
      await queryClient.invalidateQueries({ queryKey: ["workflow"] });
      form.reset();
      toastService.success("Saved successfully.");
    } catch (submitError) {
      toastService.error(getWorkflowErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={className}>
      <h2 className="mb-4 text-base font-semibold text-text-primary">{title}</h2>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {fields.map((field) => {
          if (field.type === "select") {
            return (
              <Select
                key={field.name}
                name={field.name}
                label={field.label}
                required={field.required}
                defaultValue=""
              >
                <option value="" disabled>
                  Select {field.label.toLowerCase()}
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            );
          }
          if (field.type === "textarea") {
            return (
              <Textarea
                key={field.name}
                name={field.name}
                label={field.label}
                required={field.required}
                rows={3}
              />
            );
          }
          return (
            <Input
              key={field.name}
              name={field.name}
              type={field.type ?? "text"}
              label={field.label}
              required={field.required}
              step={field.step}
            />
          );
        })}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
