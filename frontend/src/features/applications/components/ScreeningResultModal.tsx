import { useState, type FormEvent } from "react";

import { FormModal } from "../../../components/overlays/FormModal";
import { Alert } from "../../../components/feedback/Alert";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import type {
  ScreeningAction,
  ScreeningResultInput,
} from "../types/application";

export interface ScreeningResultModalProps {
  action: Extract<ScreeningAction, "pass" | "fail"> | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (result: ScreeningResultInput) => void;
}

export function ScreeningResultModal({
  action,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ScreeningResultModalProps) {
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [incomeVerified, setIncomeVerified] = useState(false);
  const [employmentVerified, setEmploymentVerified] = useState(false);
  const [referencesChecked, setReferencesChecked] = useState(false);
  const [error, setError] = useState("");
  const verificationChecks: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }[] = [
    {
      label: "Income verified",
      checked: incomeVerified,
      onChange: setIncomeVerified,
    },
    {
      label: "Employment verified",
      checked: employmentVerified,
      onChange: setEmploymentVerified,
    },
    {
      label: "References checked",
      checked: referencesChecked,
      onChange: setReferencesChecked,
    },
  ];

  function resetForm() {
    setScore("");
    setNotes("");
    setIncomeVerified(false);
    setEmploymentVerified(false);
    setReferencesChecked(false);
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result: ScreeningResultInput = {
      notes: notes.trim(),
      income_verified: incomeVerified,
      employment_verified: employmentVerified,
      references_checked: referencesChecked,
    };

    if (score !== "") {
      const parsedScore = Number(score);
      if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        setError("Enter a whole-number score between 0 and 100.");
        return;
      }
      result.score = parsedScore;
    }

    setError("");
    onSubmit(result);
  }

  return (
    <FormModal
      open={action !== null}
      title={action === "pass" ? "Pass screening" : "Fail screening"}
      description="Record the screening outcome and verification checks."
      onClose={() => {
        resetForm();
        onClose();
      }}
      onSubmit={handleSubmit}
      submitLabel={action === "pass" ? "Pass screening" : "Fail screening"}
      submitVariant={action === "fail" ? "danger" : "primary"}
      isSubmitting={isSubmitting}
    >
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <Input
        label="Screening score"
        type="number"
        min={0}
        max={100}
        step={1}
        value={score}
        onChange={(event) => setScore(event.currentTarget.value)}
        helperText="Optional. Enter a whole number from 0 to 100."
      />
      <Textarea
        label="Screening notes"
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
        rows={3}
      />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-primary">
          Verification checks
        </legend>
        {verificationChecks.map(({ checked, label, onChange }) => (
          <label
            key={label}
            className="flex items-center gap-2 text-sm text-text-primary"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.currentTarget.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-omni-blue focus:ring-omni-blue"
            />
            {label}
          </label>
        ))}
      </fieldset>
    </FormModal>
  );
}
