import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type TenantSelectorProps = EntitySelectorProps;

export function TenantSelector({
  placeholder = "Select a tenant",
  ...props
}: TenantSelectorProps) {
  return <EntitySelector {...props} placeholder={placeholder} />;
}
