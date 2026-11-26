import { forwardRef } from "react";

import { Input, type InputProps } from "../ui/Input";

export type CurrencyFieldProps = Omit<InputProps, "type" | "step">;

export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
  function CurrencyField({ inputMode = "decimal", ...props }, ref) {
    return <Input ref={ref} type="number" step="0.01" inputMode={inputMode} {...props} />;
  },
);
