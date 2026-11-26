import type { Deposit, PaymentDetails } from "../types/finance";

export type DepositAction = "record-payment" | "refund" | "forfeit";
export type PaymentAction = "allocate" | "reverse";

export function getDepositActions(deposit: Deposit): DepositAction[] {
  const actions: DepositAction[] = [];
  if (
    deposit.status === "PENDING" ||
    deposit.status === "PARTIALLY_PAID"
  ) {
    actions.push("record-payment");
  }
  if (
    deposit.status === "PAID" ||
    deposit.status === "PARTIALLY_PAID" ||
    deposit.status === "PARTIALLY_REFUNDED"
  ) {
    actions.push("refund");
  }
  if (
    Number(deposit.paid_amount) > 0 &&
    deposit.status !== "REFUNDED" &&
    deposit.status !== "FORFEITED"
  ) {
    actions.push("forfeit");
  }
  return actions;
}

export function getPaymentActions(payment: PaymentDetails): PaymentAction[] {
  if (payment.status === "PENDING") return ["allocate"];
  if (payment.status === "COMPLETED") return ["reverse"];
  return [];
}

export function getBusinessDate(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Mogadishu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}
