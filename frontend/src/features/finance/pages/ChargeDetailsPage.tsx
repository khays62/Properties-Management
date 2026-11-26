import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { getListReturnPath } from "../../../utils/navigation";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { RentChargeActionsMenu, type RentChargeAction } from "../components/RentChargeActionsMenu";
import { RentChargeWorkflowDialogs } from "../components/RentChargeWorkflowDialogs";
import { useRentCharge } from "../hooks/useFinance";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ChargeDetailsPage() {
  const { chargeId = "" } = useParams<{ chargeId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const query = useRentCharge(chargeId);
  const [action, setAction] = useState<RentChargeAction | null>(null);
  const listPath = getListReturnPath(
    location.state,
    "/finance/charges",
    "/finance/charges",
  );
  const charge = query.data;
  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Charges", href: listPath },
        { label: "Charge details", current: true },
      ]}
    />
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <LoadingState
          label="Loading rent charge"
          message="Loading rent charge details…"
        />
      </div>
    );
  }

  if (query.isError || !charge) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <ErrorState
          title="Unable to load rent charge"
          description={
            query.error
              ? getFinanceErrorMessage(query.error)
              : "The rent charge could not be found."
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
        title={`Charge ${charge.billing_month}/${charge.billing_year}`}
        subtitle={`Charge reference: ${charge.id}`}
        actions={
          canManage ? (
            <RentChargeActionsMenu
              charge={charge}
              canManage
              onAction={setAction}
            />
          ) : undefined
        }
      />
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Charge details
          </h2>
          <StatusBadge status={charge.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Tenant ID</dt>
            <dd className="mt-1 break-all font-medium">{charge.tenant}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Lease ID</dt>
            <dd className="mt-1 break-all font-medium">{charge.lease}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Billing period</dt>
            <dd className="mt-1 font-medium">
              {charge.billing_month}/{charge.billing_year}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Charge amount</dt>
            <dd className="mt-1 font-medium">{charge.amount}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Balance</dt>
            <dd className="mt-1 font-medium">{charge.balance}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Due date</dt>
            <dd className="mt-1 font-medium">{formatDate(charge.due_date)}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Invoice number</dt>
            <dd className="mt-1 font-medium">
              {charge.invoice_number ?? "No invoice has been issued."}
            </dd>
          </div>
        </dl>
      </Card>
      <RentChargeWorkflowDialogs
        charge={charge}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  );
}
