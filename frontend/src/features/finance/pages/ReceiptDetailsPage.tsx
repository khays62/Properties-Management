import { Link, useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { getListReturnPath } from "../../../utils/navigation";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { useReceipt } from "../hooks/useFinance";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ReceiptDetailsPage() {
  const { receiptId = "" } = useParams<{ receiptId: string }>();
  const location = useLocation();
  const query = useReceipt(receiptId);
  const receipt = query.data;
  const listPath = getListReturnPath(
    location.state,
    "/finance/receipts",
    "/finance/receipts",
  );
  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Receipts", href: listPath },
        {
          label: receipt?.receipt_number ?? "Receipt details",
          current: true,
        },
      ]}
    />
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <LoadingState label="Loading receipt" message="Loading receipt…" />
      </div>
    );
  }

  if (query.isError || !receipt) {
    return (
      <div className="space-y-6 py-6">
        <FinanceNavigation />
        {breadcrumbs}
        <ErrorState
          title="Unable to load receipt"
          description={
            query.error
              ? getFinanceErrorMessage(query.error)
              : "The receipt could not be found."
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
        title={receipt.receipt_number}
        subtitle="Receipt for a completed payment."
      />
      <Card>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Receipt number</dt>
            <dd className="mt-1 font-medium">{receipt.receipt_number}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Payment</dt>
            <dd className="mt-1 break-all font-medium">
              <Link
                to={`/finance/payments/${receipt.payment}`}
                className="text-omni-blue hover:underline"
              >
                {receipt.payment}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Generated</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(receipt.generated_at)}
            </dd>
          </div>
        </dl>
        <p className="mt-6 border-t border-[var(--color-border)] pt-4 text-sm text-text-secondary">
          The receipt API provides the receipt number, payment reference, and
          generated timestamp. Payment and allocation details are available on
          the linked payment.
        </p>
      </Card>
    </div>
  );
}
