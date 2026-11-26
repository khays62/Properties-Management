import { z } from "zod";

export const PROPERTY_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export const propertySchema = z
  .object({
    id: z.string().uuid(),
    owner: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    description: z.string(),
    address: z.string(),
    city: z.string(),
    country: z.string(),
    status: z.enum(PROPERTY_STATUSES),
    unit_count: z.number().int().nonnegative(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const propertyUnitSchema = z
  .object({
    id: z.string().uuid(),
    unit_number: z.string(),
    status: z.string(),
    bedrooms: z.number(),
    rent_amount: z.union([z.string(), z.number()]),
  })
  .passthrough();

export const propertyDetailsSchema = propertySchema.extend({
  units: z.array(propertyUnitSchema),
});

export interface PropertyInput {
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  country: string;
}

export interface PropertyQueryParams {
  search?: string;
  status?: PropertyStatus;
  city?: string;
  page?: number;
}

export interface PropertyCollection {
  results: Property[];
  count: number;
}

export interface PropertyAssignment {
  id: string;
  property_id: string;
  manager: string;
  assigned_date: string;
  is_active: boolean;
}

export type Property = z.infer<typeof propertySchema>;
export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;
export type PropertyUnit = z.infer<typeof propertyUnitSchema>;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
