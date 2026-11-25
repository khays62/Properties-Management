import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
} from "react";

import { Button } from "../ui/Button";
import { Input, type InputProps } from "../ui/Input";

export interface SearchInputProps
  extends Omit<
    InputProps,
    | "defaultValue"
    | "error"
    | "helperText"
    | "label"
    | "onChange"
    | "type"
    | "value"
  > {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  debounceMs?: number;
  label?: string;
  inputClassName?: string;
}

export function SearchInput({
  className,
  debounceMs = 300,
  disabled,
  id,
  inputClassName,
  label = "Search",
  onSearch,
  onValueChange,
  value,
  ...inputProps
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  function scheduleSearch(nextValue: string) {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      onSearchRef.current(nextValue);
      timerRef.current = null;
    }, Math.max(0, debounceMs));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value;
    onValueChange(nextValue);
    scheduleSearch(nextValue);
  }

  function clearSearch() {
    onValueChange("");
    scheduleSearch("");
    inputRef.current?.focus();
  }

  return (
    <div className={["relative w-full", className].filter(Boolean).join(" ")}>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <Input
        {...inputProps}
        ref={inputRef}
        id={inputId}
        type="search"
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className={[
          "pl-10",
          value ? "pr-10" : "pr-3",
          inputClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        fill="none"
        viewBox="0 0 20 20"
      >
        <circle
          cx="8.75"
          cy="8.75"
          r="5.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m13 13 4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear search"
          disabled={disabled}
          onClick={clearSearch}
          className="absolute right-1 top-1/2 z-10 h-8 min-h-0 w-8 -translate-y-1/2 p-0 text-text-secondary"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d="m5 5 10 10M15 5 5 15"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
        </Button>
      )}
    </div>
  );
}
