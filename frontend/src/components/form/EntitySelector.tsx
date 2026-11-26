import { forwardRef } from "react";

import { Select, type SelectProps } from "../ui/Select";

export interface EntitySelectorOption {
  label: string;
  value: string;
}

export interface EntitySelectorProps
  extends Omit<SelectProps, "children"> {
  options: readonly EntitySelectorOption[];
  placeholder?: string;
}

export const EntitySelector = forwardRef<HTMLSelectElement, EntitySelectorProps>(
  function EntitySelector(
    { options, placeholder = "Select an option", ...props },
    ref,
  ) {
    return (
      <Select {...props} ref={ref}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  },
);
