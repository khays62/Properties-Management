import { z } from "zod";

export const DEPOSIT_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "FORFEITED",
] as const;

export const RENT_CHARGE_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export const RENT_FREQUENCIES = ["MONTHLY"] as const;

export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
] as const;

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_MONEY",
  "CARD",
] as const;

const uuidSchema = z.string().uuid();
const amountSchema = z.union([z.string(), z.number()]);

export const depositSchema = z.object({
  id: uuidSchema,
  lease: uuidSchema,
  required_amount: amountSchema,
  paid_amount: amountSchema,
  reference_number: z.string().nullable(),
  payment_date: z.string().nullable(),
  payment_method: z.enum(PAYMENT_METHODS).nullable(),
  status: z.enum(DEPOSIT_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export const rentChargeSchema = z.object({
  id: uuidSchema,
  lease: uuidSchema,
  tenant: uuidSchema,
  invoice_number: z.string().nullable(),
  billing_month: z.number().int().min(1).max(12),
  billing_year: z.number().int().positive(),
  amount: amountSchema,
  balance: amountSchema,
  due_date: z.string(),
  status: z.enum(RENT_CHARGE_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export const rentScheduleSchema = z.object({
  id: uuidSchema,
  lease: uuidSchema,
  due_day: z.number().int().min(1).max(31),
  frequency: z.enum(RENT_FREQUENCIES),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const paymentAllocationSchema = z.object({
  id: uuidSchema,
  payment: uuidSchema,
  rent_charge: uuidSchema,
  amount_allocated: amountSchema,
});

export const paymentSchema = z.object({
  id: uuidSchema,
  tenant: uuidSchema,
  amount: amountSchema,
  payment_date: z.string(),
  reference_number: z.string(),
  payment_method: z.enum(PAYMENT_METHODS),
  notes: z.string(),
  status: z.enum(PAYMENT_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export const paymentDetailsSchema = paymentSchema.extend({
  allocations: z.array(paymentAllocationSchema),
});

export const receiptSchema = z.object({
  id: uuidSchema,
  payment: uuidSchema,
  receipt_number: z.string(),
  generated_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const issuedInvoiceSchema = z.object({
  id: uuidSchema,
  rent_charge: uuidSchema,
  invoice_number: z.string(),
  issued_date: z.string(),
});

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];
export type RentChargeStatus = (typeof RENT_CHARGE_STATUSES)[number];
export type RentFrequency = (typeof RENT_FREQUENCIES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type Deposit = z.infer<typeof depositSchema>;
export type RentCharge = z.infer<typeof rentChargeSchema>;
export type RentSchedule = z.infer<typeof rentScheduleSchema>;
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type IssuedInvoice = z.infer<typeof issuedInvoiceSchema>;

export interface FinanceCollection<T> {
  results: T[];
  count: number;
}

export interface FinanceListParams {
  page?: number;
  search?: string;
  status?: string;
  tenant?: string;
  lease?: string;
}

export interface RentChargeQueryParams extends FinanceListParams {
  billing_month?: number;
  billing_year?: number;
}

export interface PaymentQueryParams extends FinanceListParams {
  payment_method?: PaymentMethod;
}

export interface ReceiptQueryParams extends Omit<FinanceListParams, "status" | "lease"> {
  payment?: string;
}

export interface DepositCreateInput {
  lease: string;
}

export interface DepositPaymentInput {
  amount: string;
  reference_number: string;
  payment_date?: string;
  payment_method: PaymentMethod;
}

export interface DepositRefundInput {
  amount?: string;
}

export interface RentChargeGenerateInput {
  billing_month: number;
  billing_year: number;
}

export interface RentScheduleCreateInput {
  lease: string;
  due_day: number;
  frequency: RentFrequency;
  is_active: boolean;
}

export interface RentScheduleUpdateInput {
  due_day: number;
  frequency: RentFrequency;
  is_active: boolean;
}

export interface PaymentCreateInput {
  tenant: string;
  amount: string;
  payment_date: string;
  reference_number: string;
  payment_method: PaymentMethod;
  notes: string;
}

export interface PaymentAllocationInput {
  rent_charge: string;
  amount_allocated: string;
}

export interface AllocatePaymentInput {
  allocations: PaymentAllocationInput[];
}
