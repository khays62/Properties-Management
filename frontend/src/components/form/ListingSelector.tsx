import { forwardRef } from "react";

import { EntitySelector, type EntitySelectorProps } from "./EntitySelector";

export type ListingSelectorProps = EntitySelectorProps;

export const ListingSelector = forwardRef<
  HTMLSelectElement,
  ListingSelectorProps
>(function ListingSelector(
  { placeholder = "Select a listing", ...props },
  ref,
) {
  return <EntitySelector {...props} placeholder={placeholder} ref={ref} />;
});
