import { forwardRef } from "react";

import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type PropertySelectorProps = EntitySelectorProps;

export const PropertySelector = forwardRef<
  HTMLSelectElement,
  PropertySelectorProps
>(function PropertySelector(
  { placeholder = "Select a property", ...props },
  ref,
) {
  return <EntitySelector {...props} placeholder={placeholder} ref={ref} />;
});
