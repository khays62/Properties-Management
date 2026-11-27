import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  AllocatePaymentInput,
  DepositCreateInput,
  DepositPaymentInput,
  DepositRefundInput,
  FinanceListParams,
  PaymentCreateInput,
  PaymentQueryParams,
  ReceiptQueryParams,
  RentChargeGenerateInput,
  RentChargeQueryParams,
  RentScheduleCreateInput,
  RentScheduleUpdateInput,
} from "../types/finance";
import {
  allocatePayment,
  createDeposit,
  createPayment,
  createRentSchedule,
  fetchAllLeaseOptions,
  fetchAllRentSchedules,
  fetchAllRentCharges,
  fetchDeposit,
  fetchDeposits,
  fetchPayment,
  fetchPayments,
  fetchReceipt,
  fetchReceipts,
  fetchRentCharge,
  fetchRentCharges,
  fetchRentSchedules,
  forfeitDeposit,
  generateRentCharges,
  issueRentChargeInvoice,
  markRentChargeOverdue,
  recordDepositPayment,
  refundDeposit,
  reversePayment,
  updateRentSchedule,
} from "../api/finance.api";

export const financeQueryKeys = {
  deposits: ["finance", "deposits"] as const,
  deposit: (id: string) => ["finance", "deposit", id] as const,
  charges: ["finance", "charges"] as const,
  charge: (id: string) => ["finance", "charge", id] as const,
  rentSchedules: ["finance", "rent-schedules"] as const,
  allRentSchedules: ["finance", "rent-schedules", "all"] as const,
  payments: ["finance", "payments"] as const,
  payment: (id: string) => ["finance", "payment", id] as const,
  receipts: ["finance", "receipts"] as const,
  receipt: (id: string) => ["finance", "receipt", id] as const,
  leaseOptions: ["finance", "lease-options"] as const,
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) {
  return Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export function useDeposits(params: FinanceListParams) {
  return useQuery({
    queryKey: [...financeQueryKeys.deposits, params],
    queryFn: () => fetchDeposits(params),
  });
}

export function useDeposit(id: string) {
  return useQuery({
    queryKey: financeQueryKeys.deposit(id),
    queryFn: () => fetchDeposit(id),
    enabled: id.length > 0,
  });
}

export function useFinanceLeaseOptions(enabled = true) {
  return useQuery({
    queryKey: financeQueryKeys.leaseOptions,
    queryFn: fetchAllLeaseOptions,
    enabled,
  });
}

export function useRentSchedules(params: FinanceListParams, enabled = true) {
  return useQuery({
    queryKey: [...financeQueryKeys.rentSchedules, params],
    queryFn: () => fetchRentSchedules(params),
    enabled,
  });
}

export function useAllRentSchedules(enabled = true) {
  return useQuery({
    queryKey: financeQueryKeys.allRentSchedules,
    queryFn: fetchAllRentSchedules,
    enabled,
  });
}

export function useCreateRentSchedule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: RentScheduleCreateInput) => createRentSchedule(values),
    onSuccess: () =>
      invalidate(client, [
        financeQueryKeys.rentSchedules,
        financeQueryKeys.charges,
      ]),
  });
}

export function useUpdateRentSchedule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: RentScheduleUpdateInput;
    }) => updateRentSchedule(id, values),
    onSuccess: () =>
      invalidate(client, [
        financeQueryKeys.rentSchedules,
        financeQueryKeys.charges,
      ]),
  });
}

export function useCreateDeposit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: DepositCreateInput) => createDeposit(values),
    onSuccess: () => invalidate(client, [financeQueryKeys.deposits]),
  });
}

export function useRecordDepositPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: DepositPaymentInput;
    }) => recordDepositPayment(id, values),
    onSuccess: (deposit) =>
      invalidate(client, [
        financeQueryKeys.deposits,
        financeQueryKeys.deposit(deposit.id),
      ]),
  });
}

export function useRefundDeposit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: DepositRefundInput;
    }) => refundDeposit(id, values),
    onSuccess: (deposit) =>
      invalidate(client, [
        financeQueryKeys.deposits,
        financeQueryKeys.deposit(deposit.id),
      ]),
  });
}

export function useForfeitDeposit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forfeitDeposit(id),
    onSuccess: (deposit) =>
      invalidate(client, [
        financeQueryKeys.deposits,
        financeQueryKeys.deposit(deposit.id),
      ]),
  });
}

export function useRentCharges(params: RentChargeQueryParams) {
  return useQuery({
    queryKey: [...financeQueryKeys.charges, params],
    queryFn: () => fetchRentCharges(params),
  });
}

export function useAllRentCharges(
  params: RentChargeQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...financeQueryKeys.charges, "all", params],
    queryFn: () => fetchAllRentCharges(params),
    enabled,
  });
}

export function useRentCharge(id: string) {
  return useQuery({
    queryKey: financeQueryKeys.charge(id),
    queryFn: () => fetchRentCharge(id),
    enabled: id.length > 0,
  });
}

export function useGenerateRentCharges() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: RentChargeGenerateInput) =>
      generateRentCharges(values),
    onSuccess: () => invalidate(client, [financeQueryKeys.charges]),
  });
}

export function useMarkRentChargeOverdue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRentChargeOverdue(id),
    onSuccess: (charge) =>
      invalidate(client, [
        financeQueryKeys.charges,
        financeQueryKeys.charge(charge.id),
      ]),
  });
}

export function useIssueRentChargeInvoice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => issueRentChargeInvoice(id),
    onSuccess: (invoice) =>
      invalidate(client, [
        financeQueryKeys.charges,
        financeQueryKeys.charge(invoice.rent_charge),
      ]),
  });
}

export function usePayments(params: PaymentQueryParams) {
  return useQuery({
    queryKey: [...financeQueryKeys.payments, params],
    queryFn: () => fetchPayments(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: financeQueryKeys.payment(id),
    queryFn: () => fetchPayment(id),
    enabled: id.length > 0,
  });
}

export function useCreatePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: PaymentCreateInput) => createPayment(values),
    onSuccess: () => invalidate(client, [financeQueryKeys.payments]),
  });
}

export function useAllocatePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: AllocatePaymentInput;
    }) => allocatePayment(id, values),
    onSuccess: (payment) =>
      invalidate(client, [
        financeQueryKeys.payments,
        financeQueryKeys.payment(payment.id),
        financeQueryKeys.charges,
        financeQueryKeys.receipts,
      ]),
  });
}

export function useReversePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reversePayment(id),
    onSuccess: (payment) =>
      invalidate(client, [
        financeQueryKeys.payments,
        financeQueryKeys.payment(payment.id),
        financeQueryKeys.charges,
      ]),
  });
}

export function useReceipts(params: ReceiptQueryParams) {
  return useQuery({
    queryKey: [...financeQueryKeys.receipts, params],
    queryFn: () => fetchReceipts(params),
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: financeQueryKeys.receipt(id),
    queryFn: () => fetchReceipt(id),
    enabled: id.length > 0,
  });
}
