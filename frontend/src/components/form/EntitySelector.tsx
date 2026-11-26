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

export function EntitySelector({
  options,
  placeholder = "Select an option",
  ...props
}: EntitySelectorProps) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
