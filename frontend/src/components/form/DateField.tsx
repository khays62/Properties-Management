import { forwardRef } from "react";

import { Input, type InputProps } from "../ui/Input";

export type DateFieldProps = Omit<InputProps, "type">;

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(props, ref) {
    return <Input ref={ref} type="date" {...props} />;
  },
);
