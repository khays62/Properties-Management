import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
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
      <input
        {...props}
        ref={ref}
        id={controlId}
        className={["op-field__control", className].filter(Boolean).join(" ")}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
      {helperText && (
        <p id={helperId} className="op-field__message op-field__message--helper">
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
});
