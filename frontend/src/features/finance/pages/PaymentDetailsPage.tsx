import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, DataTable, PageHeader, type DataTableColumn } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { getListReturnPath } from "../../../utils/navigation";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { PaymentActionsMenu } from "../components/PaymentActionsMenu";
import { PaymentWorkflowDialogs } from "../components/PaymentWorkflowDialogs";
import { usePayment } from "../hooks/useFinance";
import type { PaymentAllocation } from "../types/finance";
import type { PaymentAction } from "../utils/actions";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

const allocationColumns: DataTableColumn<PaymentAllocation>[] = [
  {
    id: "rent_charge",
    header: "Rent charge",
    render: (allocation) => (
      <Link
        to={`/finance/charges/${allocation.rent_charge}`}
        className="font-medium text-omni-blue hover:underline"
      >
        {allocation.rent_charge_label ?? "Rent charge details unavailable"}
      </Link>
    ),
  },
  {
    id: "amount_allocated",
    header: "Allocated amount",
    sortValue: (allocation) => Number(allocation.amount_allocated),
    render: (allocation) => String(allocation.amount_allocated),
  },
];

export function PaymentDetailsPage() {
  const { paymentId = "" } = useParams<{ paymentId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const query = usePayment(paymentId);
  const [action, setAction] = useState<PaymentAction | null>(null);
  const listPath = getListReturnPath(
    location.state,
    "/finance/payments",
    "/finance/payments",
  );
  const payment = query.data;
  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Payments", href: listPath },
        { label: payment?.reference_number ?? "Payment details", current: true },
      ]}
    />
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <LoadingState label="Loading payment" message="Loading payment details…" />
      </div>
    );
  }

  if (query.isError || !payment) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <ErrorState
          title="Unable to load payment"
          description={
            query.error
              ? getFinanceErrorMessage(query.error)
              : "The payment could not be found."
          }
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <FinanceNavigation />
      {breadcrumbs}
      <PageHeader
        title={payment.reference_number}
        subtitle="Payment information and rent-charge allocations."
        actions={
          canManage ? (
            <PaymentActionsMenu
              payment={payment}
              onAction={setAction}
            />
          ) : undefined
        }
      />
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Payment details
          </h2>
          <StatusBadge status={payment.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Tenant</dt>
            <dd className="mt-1 font-medium">
              {payment.tenant_name ?? "Tenant details unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Amount</dt>
            <dd className="mt-1 font-medium">{payment.amount}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Payment date</dt>
            <dd className="mt-1 font-medium">{formatDate(payment.payment_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Method</dt>
            <dd className="mt-1 font-medium">
              {payment.payment_method.replace(/_/g, " ")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Recorded</dt>
            <dd className="mt-1 font-medium">
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Mogadishu",
              }).format(new Date(payment.created_at))}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {payment.notes || "No notes provided."}
            </dd>
          </div>
        </dl>
      </Card>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Allocations
          </h2>
          <p className="text-sm text-text-secondary">
            Allocation records returned by the Finance API.
          </p>
        </div>
        <DataTable
          ariaLabel="Payment allocations"
          columns={allocationColumns}
          data={payment.allocations}
          getRowId={(allocation) => allocation.id}
          emptyMessage="This payment has not been allocated."
        />
      </section>
      {payment.status === "COMPLETED" && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-text-primary">Receipt</h2>
            <p className="mt-1 text-sm text-text-secondary">
              A receipt is generated when this payment is allocated.
            </p>
          </div>
          <Link
            to={`/finance/receipts?payment=${payment.id}`}
            className="font-medium text-omni-blue hover:underline"
          >
            View payment receipt
          </Link>
        </Card>
      )}
      <PaymentWorkflowDialogs
        payment={payment}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  );
}
