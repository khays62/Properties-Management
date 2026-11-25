import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      "aria-describedby": ariaDescribedBy,
      className,
      error,
      helperText,
      id,
      label,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const helperId = helperText ? `${controlId}-helper` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const describedBy = [ariaDescribedBy, helperId, errorId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="op-field">
        {label && (
          <label className="op-field__label" htmlFor={controlId}>
            {label}
          </label>
        )}
        <textarea
          {...props}
          ref={ref}
          id={controlId}
          className={[
            "op-field__control",
            "op-field__control--textarea",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : props["aria-invalid"]}
        />
        {helperText && (
          <p
            id={helperId}
            className="op-field__message op-field__message--helper"
          >
            {helperText}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="op-field__message op-field__message--error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
