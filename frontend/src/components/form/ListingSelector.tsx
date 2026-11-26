import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type ListingSelectorProps = EntitySelectorProps;

export function ListingSelector({
  placeholder = "Select a listing",
  ...props
}: ListingSelectorProps) {
  return <EntitySelector {...props} placeholder={placeholder} />;
}
