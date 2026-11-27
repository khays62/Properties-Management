import { z } from "zod";

import { fetchLeases } from "../../leases/api/leases.api";
import type { LeaseDetails } from "../../leases/types/lease";
import {
  depositSchema,
  issuedInvoiceSchema,
  paymentDetailsSchema,
  paymentSchema,
  receiptSchema,
  rentChargeSchema,
  rentScheduleSchema,
  type AllocatePaymentInput,
  type Deposit,
  type DepositCreateInput,
  type DepositPaymentInput,
  type DepositRefundInput,
  type FinanceCollection,
  type FinanceListParams,
  type IssuedInvoice,
  type Payment,
  type PaymentCreateInput,
  type PaymentDetails,
  type PaymentQueryParams,
  type Receipt,
  type ReceiptQueryParams,
  type RentCharge,
  type RentChargeGenerateInput,
  type RentChargeQueryParams,
  type RentSchedule,
  type RentScheduleCreateInput,
  type RentScheduleUpdateInput,
} from "../types/finance";
import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";

interface PagePayload {
  count: number;
  results: unknown[];
}

function isPagePayload(value: unknown): value is PagePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

function parseCollection<T extends z.ZodType>(
  payload: unknown,
  schema: T,
): FinanceCollection<z.infer<T>> {
  if (Array.isArray(payload)) {
    const results = z.array(schema).parse(payload);
    return { results, count: results.length };
  }
  if (isPagePayload(payload)) {
    return {
      results: z.array(schema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid finance collection.");
}

async function fetchCollection<T extends z.ZodType>(
  path: string,
  params: FinanceListParams,
  schema: T,
): Promise<FinanceCollection<z.infer<T>>> {
  const response = await api.get<unknown>(path, { params });
  return parseCollection(response.data, schema);
}

export function fetchDeposits(params: FinanceListParams = {}) {
  return fetchCollection("deposits/", params, depositSchema);
}

export async function fetchDeposit(id: string): Promise<Deposit> {
  const response = await api.get<unknown>(`deposits/${id}/`);
  return depositSchema.parse(response.data);
}

export async function createDeposit(
  values: DepositCreateInput,
): Promise<Deposit> {
  const response = await api.post<unknown>("deposits/", values);
  return depositSchema.parse(response.data);
}

export async function recordDepositPayment(
  id: string,
  values: DepositPaymentInput,
): Promise<Deposit> {
  const response = await api.post<unknown>(
    `deposits/${id}/record-payment/`,
    values,
  );
  return depositSchema.parse(response.data);
}

export async function refundDeposit(
  id: string,
  values: DepositRefundInput,
): Promise<Deposit> {
  const response = await api.post<unknown>(`deposits/${id}/refund/`, values);
  return depositSchema.parse(response.data);
}

export async function forfeitDeposit(id: string): Promise<Deposit> {
  const response = await api.post<unknown>(`deposits/${id}/forfeit/`, {});
  return depositSchema.parse(response.data);
}

export function fetchRentSchedules(
  params: FinanceListParams = {},
): Promise<FinanceCollection<RentSchedule>> {
  return fetchCollection("rent-schedules/", params, rentScheduleSchema);
}

export async function fetchAllRentSchedules(): Promise<RentSchedule[]> {
  const results: RentSchedule[] = [];
  let page = 1;
  let count = Number.POSITIVE_INFINITY;
  while (results.length < count) {
    const collection = await fetchRentSchedules({ page });
    results.push(...collection.results);
    count = collection.count;
    if (collection.results.length === 0) break;
    page += 1;
  }
  return results;
}

export async function createRentSchedule(
  values: RentScheduleCreateInput,
): Promise<RentSchedule> {
  const response = await api.post<unknown>("rent-schedules/", values);
  return rentScheduleSchema.parse(response.data);
}

export async function updateRentSchedule(
  id: string,
  values: RentScheduleUpdateInput,
): Promise<RentSchedule> {
  const response = await api.patch<unknown>(`rent-schedules/${id}/`, values);
  return rentScheduleSchema.parse(response.data);
}

export async function fetchRentCharges(
  params: RentChargeQueryParams = {},
): Promise<FinanceCollection<RentCharge>> {
  const response = await api.get<unknown>("rent-charges/", { params });
  return parseCollection(response.data, rentChargeSchema);
}

export async function fetchAllRentCharges(
  params: RentChargeQueryParams = {},
): Promise<RentCharge[]> {
  const filters = { ...params };
  delete filters.page;
  const results: RentCharge[] = [];
  let page = 1;
  let count = Number.POSITIVE_INFINITY;
  while (results.length < count) {
    const collection = await fetchRentCharges({ ...filters, page });
    results.push(...collection.results);
    count = collection.count;
    if (collection.results.length === 0) break;
    page += 1;
  }
  return results;
}

export async function fetchRentCharge(id: string): Promise<RentCharge> {
  const response = await api.get<unknown>(`rent-charges/${id}/`);
  return rentChargeSchema.parse(response.data);
}

export async function generateRentCharges(
  values: RentChargeGenerateInput,
): Promise<RentCharge[]> {
  const response = await api.post<unknown>("rent-charges/generate/", values);
  return z.array(rentChargeSchema).parse(response.data);
}

export async function markRentChargeOverdue(id: string): Promise<RentCharge> {
  const response = await api.post<unknown>(
    `rent-charges/${id}/mark-overdue/`,
    {},
  );
  return rentChargeSchema.parse(response.data);
}

export async function issueRentChargeInvoice(
  id: string,
): Promise<IssuedInvoice> {
  const response = await api.post<unknown>(
    `rent-charges/${id}/issue-invoice/`,
    {},
  );
  return issuedInvoiceSchema.parse(response.data);
}

export async function fetchPayments(
  params: PaymentQueryParams = {},
): Promise<FinanceCollection<PaymentDetails>> {
  const response = await api.get<unknown>("payments/", { params });
  return parseCollection(response.data, paymentDetailsSchema);
}

export async function fetchPayment(id: string): Promise<PaymentDetails> {
  const response = await api.get<unknown>(`payments/${id}/`);
  return paymentDetailsSchema.parse(response.data);
}

export async function createPayment(
  values: PaymentCreateInput,
): Promise<Payment> {
  const response = await api.post<unknown>("payments/", values);
  return paymentSchema.parse(response.data);
}

export async function allocatePayment(
  id: string,
  values: AllocatePaymentInput,
): Promise<PaymentDetails> {
  const response = await api.post<unknown>(
    `payments/${id}/allocate/`,
    values,
  );
  return paymentDetailsSchema.parse(response.data);
}

export async function reversePayment(id: string): Promise<PaymentDetails> {
  const response = await api.post<unknown>(`payments/${id}/reverse/`, {});
  return paymentDetailsSchema.parse(response.data);
}

export async function fetchReceipts(
  params: ReceiptQueryParams = {},
): Promise<FinanceCollection<Receipt>> {
  const response = await api.get<unknown>("receipts/", { params });
  return parseCollection(response.data, receiptSchema);
}

export async function fetchReceipt(id: string): Promise<Receipt> {
  const response = await api.get<unknown>(`receipts/${id}/`);
  return receiptSchema.parse(response.data);
}

export async function fetchAllLeaseOptions() {
  const results: LeaseDetails[] = [];
  let page = 1;
  let count = Number.POSITIVE_INFINITY;
  while (results.length < count) {
    const collection = await fetchLeases({ page });
    results.push(...collection.results);
    count = collection.count;
    if (collection.results.length === 0) break;
    page += 1;
  }
  return results;
}

export function getFinanceErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}
