import { z } from "zod";

export const LISTING_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "EXPIRED",
] as const;

const numericValueSchema = z.union([z.string(), z.number()]);

export const listingSchema = z
  .object({
    id: z.string().uuid(),
    unit: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    rent_amount: numericValueSchema,
    deposit_amount: numericValueSchema,
    available_date: z.string(),
    published_at: z.string().nullable(),
    expires_at: z.string().nullable(),
    status: z.enum(LISTING_STATUSES),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const listingImageSchema = z.object({
  id: z.string().uuid(),
  listing: z.string().uuid(),
  image: z.string(),
  caption: z.string(),
  display_order: z.number().int().nonnegative(),
});

export const listingDetailsSchema = listingSchema.extend({
  images: z.array(listingImageSchema),
});

export interface ListingInput {
  unit: string;
  title: string;
  description: string;
  rent_amount: string;
  deposit_amount: string;
  available_date: string;
  expires_at: string | null;
}

export type ListingUpdateInput = Omit<ListingInput, "unit">;

export interface ListingQueryParams {
  property?: string;
  status?: ListingStatus;
  city?: string;
  available_date?: string;
  search?: string;
  page?: number;
}

export interface ListingCollection {
  results: Listing[];
  count: number;
}

export type Listing = z.infer<typeof listingSchema>;
export type ListingDetails = z.infer<typeof listingDetailsSchema>;
export type ListingImage = z.infer<typeof listingImageSchema>;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type ListingTransitionAction = "publish" | "pause" | "close";
