import { z } from "zod";

const numericValueSchema = z.union([z.string(), z.number()]);

export const publicListingSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    rent_amount: numericValueSchema,
    deposit_amount: numericValueSchema,
    available_date: z.string(),
    status: z.literal("PUBLISHED"),
    unit: z
      .object({
        unit_number: z.string(),
        floor: z.number().int(),
        bedrooms: z.number().int().nonnegative(),
        bathrooms: numericValueSchema,
        square_meters: numericValueSchema,
        property: z
          .object({
            name: z.string(),
            address: z.string(),
            city: z.string(),
            country: z.string(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export const PUBLIC_EMPLOYMENT_STATUSES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "STUDENT",
] as const;

function todayInMogadishu(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Mogadishu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

const dateSchema = z
  .string()
  .refine(isValidDate, "Enter a valid move-in date.")
  .refine(
    (value) => value >= todayInMogadishu(),
    "Move-in date must be today or in the future.",
  );

const incomeSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid monthly income.")
  .refine((value) => Number(value) >= 0, "Income cannot be negative.");

export const publicApplicationSchema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name.").max(150),
  last_name: z.string().trim().min(1, "Enter your last name.").max(150),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email must be 254 characters or fewer."),
  phone: z.string().trim().min(1, "Enter your phone number.").max(32),
  employment_status: z.enum(PUBLIC_EMPLOYMENT_STATUSES),
  employer_name: z.string().trim().max(255),
  monthly_income: incomeSchema,
  current_address: z.string().trim().min(1, "Enter your current address."),
  move_in_date: dateSchema,
  notes: z.string(),
});

export type PublicListing = z.infer<typeof publicListingSchema>;
export type PublicEmploymentStatus =
  (typeof PUBLIC_EMPLOYMENT_STATUSES)[number];
export type PublicApplicationFormValues = z.infer<
  typeof publicApplicationSchema
>;
export type PublicApplicationInput = {
  listing: string;
  move_in_date: string;
  notes: string;
  applicant: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    employment_status: PublicEmploymentStatus;
    employer_name: string;
    monthly_income: string;
    current_address: string;
  };
};

export function getTodayInMogadishu(): string {
  return todayInMogadishu();
}
