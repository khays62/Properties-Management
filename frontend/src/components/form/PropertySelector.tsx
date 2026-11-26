import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type PropertySelectorProps = EntitySelectorProps;

export function PropertySelector({
  placeholder = "Select a property",
  ...props
}: PropertySelectorProps) {
  return <EntitySelector {...props} placeholder={placeholder} />;
}
