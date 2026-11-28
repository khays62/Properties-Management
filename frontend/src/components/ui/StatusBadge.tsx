import type { BadgeProps } from "./Badge";
import { Badge } from "./Badge";
import {
  getStatusSemantic,
  normalizeStatus,
} from "../../constants/statusCatalog";

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: string;
  label?: string;
}

export function StatusBadge({
  label,
  status,
  variant,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      {...props}
      variant={variant ?? getStatusSemantic(status)}
      aria-label={props["aria-label"] ?? `${normalizeStatus(status)} status`}
    >
      {label ?? normalizeStatus(status)}
    </Badge>
  );
}
