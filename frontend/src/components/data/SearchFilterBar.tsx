import { FilterBar, type FilterDefinition } from "./FilterBar";
import { SearchInput } from "./SearchInput";

export interface SearchFilterBarProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  filters: readonly FilterDefinition[];
  onFilterChange: (filterId: string, value: string) => void;
  onReset: () => void;
  searchLabel?: string;
  className?: string;
}

export function SearchFilterBar({
  className,
  filters,
  onFilterChange,
  onReset,
  onSearch,
  onSearchValueChange,
  searchLabel,
  searchValue,
}: SearchFilterBarProps) {
  const canReset =
    searchValue.length > 0 || filters.some((filter) => filter.value !== "");

  return (
    <div
      className={[
        "rounded-lg border border-[var(--color-border)] bg-card p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <FilterBar
        layout="toolbar"
        ariaLabel="Search and filters"
        leadingControl={
          <SearchInput
            value={searchValue}
            onValueChange={onSearchValueChange}
            onSearch={onSearch}
            label={searchLabel}
            className="w-full"
          />
        }
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onReset}
        resetDisabled={!canReset}
      />
    </div>
  );
}
