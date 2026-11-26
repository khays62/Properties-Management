import type { ReactNode } from "react";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterDefinitionBase {
  id: string;
  label: string;
  value: string;
}

export type FilterDefinition =
  | (FilterDefinitionBase & {
      type: "select" | "status";
      options: readonly FilterOption[];
      placeholder?: string;
    })
  | (FilterDefinitionBase & {
      type: "text";
      placeholder?: string;
    })
  | (FilterDefinitionBase & {
      type: "date";
      min?: string;
      max?: string;
    });

export interface FilterBarProps {
  filters: readonly FilterDefinition[];
  onFilterChange: (filterId: string, value: string) => void;
  onReset: () => void;
  leadingControl?: ReactNode;
  layout?: "flex" | "toolbar";
  ariaLabel?: string;
  resetDisabled?: boolean;
  resetLabel?: string;
  className?: string;
}

export function FilterBar({
  className,
  filters,
  leadingControl,
  layout = "flex",
  onFilterChange,
  onReset,
  ariaLabel = "Filters",
  resetDisabled,
  resetLabel = "Reset filters",
}: FilterBarProps) {
  const hasActiveFilters = filters.some((filter) => filter.value !== "");
  const isToolbar = layout === "toolbar";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        isToolbar
          ? "flex flex-wrap items-end gap-3"
          : "flex flex-wrap items-end gap-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leadingControl && (
        <div
          className={
            isToolbar
              ? "min-w-0 grow shrink basis-full sm:min-w-64 sm:basis-64"
              : "min-w-[12rem] flex-1"
          }
        >
          {leadingControl}
        </div>
      )}
      {filters.map((filter) => (
        <div
          key={filter.id}
          className={
            isToolbar
              ? "min-w-0 grow shrink basis-full sm:min-w-48 sm:basis-48"
              : "min-w-[12rem] flex-1"
          }
        >
          {filter.type === "text" ? (
            <Input
              id={`filter-${filter.id}`}
              label={filter.label}
              placeholder={filter.placeholder}
              value={filter.value}
              onChange={(event) =>
                onFilterChange(filter.id, event.currentTarget.value)
              }
              className="w-full"
            />
          ) : filter.type === "date" ? (
            <Input
              id={`filter-${filter.id}`}
              type="date"
              label={filter.label}
              value={filter.value}
              min={filter.min}
              max={filter.max}
              onChange={(event) =>
                onFilterChange(filter.id, event.currentTarget.value)
              }
              className="w-full"
            />
          ) : (
            <Select
              id={`filter-${filter.id}`}
              label={filter.label}
              value={filter.value}
              onChange={(event) =>
                onFilterChange(filter.id, event.currentTarget.value)
              }
              className="w-full"
            >
              <option value="">
                {filter.placeholder ?? `All ${filter.label.toLowerCase()}`}
              </option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={onReset}
        disabled={resetDisabled ?? !hasActiveFilters}
        className={
          isToolbar
            ? "h-11 shrink-0 self-end whitespace-nowrap"
            : "whitespace-nowrap"
        }
      >
        {resetLabel}
      </Button>
    </div>
  );
}
