import { createRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EntitySelector } from "./EntitySelector";
import { ListingSelector } from "./ListingSelector";
import { PropertySelector } from "./PropertySelector";
import { TenantSelector } from "./TenantSelector";

const options = [
  { value: "entity-1", label: "Entity One" },
  { value: "entity-2", label: "Entity Two" },
];

const selectorCases: ReadonlyArray<readonly [string, typeof EntitySelector]> = [
  ["EntitySelector", EntitySelector],
  ["PropertySelector", PropertySelector],
  ["TenantSelector", TenantSelector],
  ["ListingSelector", ListingSelector],
];

interface FormValues {
  entity: string;
}

function RegisteredSelector({
  onSubmit,
  Selector,
}: {
  onSubmit: (values: FormValues) => void;
  Selector: typeof EntitySelector;
}) {
  const { handleSubmit, register } = useForm<FormValues>({
    defaultValues: { entity: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Selector
        label="Entity"
        options={options}
        {...register("entity")}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

function ControlledSelector({
  onSubmit,
  Selector,
}: {
  onSubmit: (values: FormValues) => void;
  Selector: typeof EntitySelector;
}) {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { entity: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="entity"
        render={({ field }) => (
          <Selector label="Entity" options={options} {...field} />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("shared entity selectors", () => {
  afterEach(cleanup);

  it.each(selectorCases)(
    "%s forwards its ref to the native select",
    (_name, Selector) => {
      const ref = createRef<HTMLSelectElement>();

      render(<Selector ref={ref} label="Entity" options={options} />);

      expect(ref.current).toBe(screen.getByRole("combobox", { name: "Entity" }));
    },
  );

  it.each(selectorCases)(
    "%s supports React Hook Form register refs",
    async (_name, Selector) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(values: FormValues) => void>();

      render(<RegisteredSelector Selector={Selector} onSubmit={onSubmit} />);
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Entity" }),
        "entity-2",
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ entity: "entity-2" });
    },
  );

  it.each(selectorCases)(
    "%s supports React Hook Form Controller refs",
    async (_name, Selector) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(values: FormValues) => void>();

      render(<ControlledSelector Selector={Selector} onSubmit={onSubmit} />);
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Entity" }),
        "entity-1",
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ entity: "entity-1" });
    },
  );
});
