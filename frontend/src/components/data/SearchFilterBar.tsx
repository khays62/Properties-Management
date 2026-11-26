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
      className={["grid gap-4 rounded-lg border border-[var(--color-border)] bg-card p-4 lg:grid-cols-[minmax(16rem,1fr)_2fr]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <SearchInput
        value={searchValue}
        onValueChange={onSearchValueChange}
        onSearch={onSearch}
        label={searchLabel}
        className="max-w-xl"
      />
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onReset}
        resetDisabled={!canReset}
        className="lg:justify-end"
      />
    </div>
  );
}
