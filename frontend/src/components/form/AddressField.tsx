import { forwardRef } from "react";

import { Input, type InputProps } from "../ui/Input";

export type AddressFieldProps = Omit<InputProps, "type">;

export const AddressField = forwardRef<HTMLInputElement, AddressFieldProps>(
  function AddressField(props, ref) {
    return (
      <Input
        ref={ref}
        type="text"
        autoComplete="street-address"
        {...props}
      />
    );
  },
);
