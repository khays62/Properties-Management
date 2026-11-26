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
import { DepositActionsMenu } from "../components/DepositActionsMenu";
import { DepositWorkflowDialogs } from "../components/DepositWorkflowDialogs";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { useDeposit } from "../hooks/useFinance";
import type { DepositAction } from "../utils/actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function DepositDetailsPage() {
  const { depositId = "" } = useParams<{ depositId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const query = useDeposit(depositId);
  const [action, setAction] = useState<DepositAction | null>(null);
  const listPath = getListReturnPath(
    location.state,
    "/finance/deposits",
    "/finance/deposits",
  );
  const deposit = query.data;
  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Deposits", href: listPath },
        { label: "Deposit details", current: true },
      ]}
    />
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <LoadingState
          label="Loading deposit"
          message="Loading deposit details…"
        />
      </div>
    );
  }

  if (query.isError || !deposit) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <ErrorState
          title="Unable to load deposit"
          description={
            query.error
              ? getFinanceErrorMessage(query.error)
              : "The deposit could not be found."
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
        title={`Deposit for lease ${deposit.lease.slice(0, 8)}`}
        subtitle="Security deposit status and latest recorded payment details."
        actions={
          canManage ? (
            <DepositActionsMenu deposit={deposit} onAction={setAction} />
          ) : undefined
        }
      />
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Deposit details
          </h2>
          <StatusBadge status={deposit.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Lease ID</dt>
            <dd className="mt-1 break-all font-medium">{deposit.lease}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Required amount</dt>
            <dd className="mt-1 font-medium">{deposit.required_amount}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Paid amount</dt>
            <dd className="mt-1 font-medium">{deposit.paid_amount}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">
              Latest payment reference
            </dt>
            <dd className="mt-1 break-all font-medium">
              {deposit.reference_number ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Payment date</dt>
            <dd className="mt-1 font-medium">
              {formatDate(deposit.payment_date)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Payment method</dt>
            <dd className="mt-1 font-medium">
              {deposit.payment_method?.replace(/_/g, " ") ?? "—"}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-text-secondary">
          The deposit API provides a single reference, date, and method field;
          it does not expose a transaction history for partial payments or
          refunds.
        </p>
      </Card>
      <DepositWorkflowDialogs
        deposit={deposit}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  );
}
