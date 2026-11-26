import { forwardRef } from "react";

import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type TenantSelectorProps = EntitySelectorProps;

export const TenantSelector = forwardRef<
  HTMLSelectElement,
  TenantSelectorProps
>(function TenantSelector(
  { placeholder = "Select a tenant", ...props },
  ref,
) {
  return <EntitySelector {...props} placeholder={placeholder} ref={ref} />;
});
