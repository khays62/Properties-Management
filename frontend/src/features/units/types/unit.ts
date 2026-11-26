import { z } from "zod";

export const UNIT_STATUSES = [
  "AVAILABLE",
  "LISTED",
  "RESERVED",
  "OCCUPIED",
  "MAINTENANCE",
  "INACTIVE",
] as const;

const numericValueSchema = z.union([z.string(), z.number()]);

export const unitSchema = z
  .object({
    id: z.string().uuid(),
    property: z.string().uuid(),
    unit_number: z.string(),
    floor: z.number().int(),
    bedrooms: z.number().int().nonnegative(),
    bathrooms: numericValueSchema,
    square_meters: numericValueSchema,
    rent_amount: numericValueSchema,
    deposit_amount: numericValueSchema,
    description: z.string(),
    status: z.enum(UNIT_STATUSES),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const unitImageSchema = z.object({
  id: z.string().uuid(),
  image: z.string(),
  caption: z.string(),
  display_order: z.number().int().nonnegative(),
});

export const unitDetailsSchema = unitSchema.extend({
  images: z.array(unitImageSchema),
});

export interface UnitInput {
  property: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  rent_amount: number;
  deposit_amount: number;
  description: string;
  status: UnitStatus;
}

export interface UnitQueryParams {
  property?: string;
  status?: UnitStatus;
  search?: string;
  page?: number;
}

export interface UnitCollection {
  results: Unit[];
  count: number;
}

export type Unit = z.infer<typeof unitSchema>;
export type UnitDetails = z.infer<typeof unitDetailsSchema>;
export type UnitImage = z.infer<typeof unitImageSchema>;
export type UnitStatus = (typeof UNIT_STATUSES)[number];
