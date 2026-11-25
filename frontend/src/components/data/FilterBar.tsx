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
      type: "date";
      min?: string;
      max?: string;
    });

export interface FilterBarProps {
  filters: readonly FilterDefinition[];
  onFilterChange: (filterId: string, value: string) => void;
  onReset: () => void;
  resetLabel?: string;
  className?: string;
}

export function FilterBar({
  className,
  filters,
  onFilterChange,
  onReset,
  resetLabel = "Reset filters",
}: FilterBarProps) {
  const hasActiveFilters = filters.some((filter) => filter.value !== "");

  return (
    <div
      role="group"
      aria-label="Filters"
      className={["flex flex-wrap items-end gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      {filters.map((filter) => (
        <div key={filter.id} className="min-w-[12rem] flex-1">
          {filter.type === "date" ? (
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
        disabled={!hasActiveFilters}
        className="whitespace-nowrap"
      >
        {resetLabel}
      </Button>
    </div>
  );
}
