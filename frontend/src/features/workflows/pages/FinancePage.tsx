import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../hooks/useAuth";
import {
  createWorkflowRecord,
  fetchWorkflowRecords,
  getRecordText,
  postWorkflowAction,
  toOptions,
  type WorkflowRecord,
} from "../api";
import { WorkflowAction } from "../components/WorkflowAction";
import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";

const chargeColumns = [
  { key: "lease", label: "Lease ID" },
  { key: "billing_month", label: "Month" },
  { key: "billing_year", label: "Year" },
  { key: "amount", label: "Amount" },
  { key: "balance", label: "Balance" },
  { key: "due_date", label: "Due date" },
  { key: "status", label: "Status" },
];

const basicColumns = [
  { key: "lease", label: "Lease ID" },
  { key: "required_amount", label: "Required" },
  { key: "paid_amount", label: "Paid" },
  { key: "status", label: "Status" },
];

const paymentColumns = [
  { key: "tenant", label: "Tenant ID" },
  { key: "amount", label: "Amount" },
  { key: "reference_number", label: "Reference" },
  { key: "payment_method", label: "Method" },
  { key: "status", label: "Status" },
];

function chargeActions(record: WorkflowRecord) {
  if (record.invoice_number) {
    return <span className="text-sm text-success">Invoiced</span>;
  }
  return (
    <WorkflowAction
      label="Issue invoice"
      onAction={() =>
        postWorkflowAction(`rent-charges/${record.id}/issue-invoice/`)
      }
    />
  );
}

export function FinancePage() {
  const { user } = useAuth();
  const canManage = ["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"].includes(
    user?.role ?? "",
  );
  const leases = useQuery({
    queryKey: ["workflow", "leases"],
    queryFn: () => fetchWorkflowRecords("leases/"),
  });
  const charges = useQuery({
    queryKey: ["workflow", "rent-charges"],
    queryFn: () => fetchWorkflowRecords("rent-charges/"),
  });
  const deposits = useQuery({
    queryKey: ["workflow", "deposits"],
    queryFn: () => fetchWorkflowRecords("deposits/"),
  });
  const payments = useQuery({
    queryKey: ["workflow", "payments"],
    queryFn: () => fetchWorkflowRecords("payments/"),
  });

  return (
    <WorkflowPage
      title="Finance"
      subtitle="Manage rent schedules, charges, invoices, deposits, payments, and receipts."
    >
      {canManage && (
        <div className="grid gap-6 xl:grid-cols-2">
          <WorkflowForm
            title="Create rent schedule"
            fields={[
              {
                name: "lease",
                label: "Lease",
                type: "select",
                required: true,
                options: toOptions(leases.data ?? [], "id"),
              },
              {
                name: "due_day",
                label: "Due day of month",
                type: "number",
                required: true,
              },
            ]}
            onSubmit={(values) =>
              createWorkflowRecord("rent-schedules/", {
                ...values,
                frequency: "MONTHLY",
              })
            }
          />
          <WorkflowForm
            title="Generate monthly rent charges"
            fields={[
              {
                name: "billing_month",
                label: "Billing month (1–12)",
                type: "number",
                required: true,
              },
              {
                name: "billing_year",
                label: "Billing year",
                type: "number",
                required: true,
              },
            ]}
            onSubmit={(values) =>
              postWorkflowAction("rent-charges/generate/", values)
            }
          />
          <WorkflowForm
            title="Record security deposit"
            fields={[
              {
                name: "lease",
                label: "Lease",
                type: "select",
                required: true,
                options: toOptions(leases.data ?? [], "id"),
              },
            ]}
            onSubmit={(values) => createWorkflowRecord("deposits/", values)}
          />
          <WorkflowForm
            title="Collect deposit payment"
            fields={[
              {
                name: "deposit",
                label: "Deposit",
                type: "select",
                required: true,
                options: toOptions(deposits.data ?? [], "id"),
              },
              {
                name: "amount",
                label: "Amount",
                type: "number",
                step: "0.01",
                required: true,
              },
              {
                name: "reference_number",
                label: "Payment reference",
                required: true,
              },
              {
                name: "payment_date",
                label: "Payment date",
                type: "date",
                required: true,
              },
              {
                name: "payment_method",
                label: "Payment method",
                type: "select",
                required: true,
                options: [
                  { value: "MOBILE_MONEY", label: "Mobile money" },
                  { value: "BANK_TRANSFER", label: "Bank transfer" },
                  { value: "CASH", label: "Cash" },
                  { value: "CARD", label: "Card" },
                ],
              },
            ]}
            onSubmit={(values) => {
              const { deposit, ...payload } = values;
              return postWorkflowAction(
                `deposits/${deposit}/record-payment/`,
                payload,
              );
            }}
          />
          <WorkflowForm
            title="Record payment"
            fields={[
              {
                name: "tenant",
                label: "Tenant",
                type: "select",
                required: true,
                options: (leases.data ?? []).map((lease) => ({
                  value: getRecordText(lease, "tenant"),
                  label: `Tenant ${getRecordText(lease, "tenant").slice(0, 8)}`,
                })),
              },
              {
                name: "amount",
                label: "Amount",
                type: "number",
                step: "0.01",
                required: true,
              },
              {
                name: "payment_date",
                label: "Payment date",
                type: "date",
                required: true,
              },
              {
                name: "reference_number",
                label: "Payment reference",
                required: true,
              },
              {
                name: "payment_method",
                label: "Payment method",
                type: "select",
                required: true,
                options: [
                  { value: "MOBILE_MONEY", label: "Mobile money" },
                  { value: "BANK_TRANSFER", label: "Bank transfer" },
                  { value: "CASH", label: "Cash" },
                  { value: "CARD", label: "Card" },
                ],
              },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            onSubmit={(values) => createWorkflowRecord("payments/", values)}
          />
          <WorkflowForm
            title="Allocate payment to rent charge"
            fields={[
              {
                name: "payment",
                label: "Payment",
                type: "select",
                required: true,
                options: (payments.data ?? []).map((payment) => ({
                  value: payment.id,
                  label: getRecordText(payment, "reference_number"),
                })),
              },
              {
                name: "rent_charge",
                label: "Rent charge",
                type: "select",
                required: true,
                options: toOptions(charges.data ?? [], "id"),
              },
              {
                name: "amount_allocated",
                label: "Amount to allocate",
                type: "number",
                step: "0.01",
                required: true,
              },
            ]}
            onSubmit={(values) => {
              const { payment, rent_charge, amount_allocated } = values;
              return postWorkflowAction(`payments/${payment}/allocate/`, {
                allocations: [{ rent_charge, amount_allocated }],
              });
            }}
          />
        </div>
      )}
      {!canManage && (
        <p className="text-sm text-text-secondary">
          Financial records are read-only for tenant accounts.
        </p>
      )}
      <WorkflowRecords
        title="Rent charges and invoices"
        path="rent-charges/"
        queryName="rent-charges"
        columns={chargeColumns}
        actions={canManage ? chargeActions : undefined}
        emptyMessage="No rent charges are available."
      />
      <WorkflowRecords
        title="Deposits"
        path="deposits/"
        queryName="deposits"
        columns={basicColumns}
        emptyMessage="No deposits are available."
      />
      <WorkflowRecords
        title="Payments"
        path="payments/"
        queryName="payments"
        columns={paymentColumns}
        emptyMessage="No payments are available."
      />
      <WorkflowRecords
        title="Receipts"
        path="receipts/"
        queryName="receipts"
        columns={[
          { key: "payment", label: "Payment ID" },
          { key: "receipt_number", label: "Receipt number" },
          { key: "generated_at", label: "Generated" },
        ]}
        emptyMessage="No receipts have been generated."
      />
    </WorkflowPage>
  );
}
