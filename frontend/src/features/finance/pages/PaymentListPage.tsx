import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type DataTableColumn,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { PaymentActionsMenu } from "../components/PaymentActionsMenu";
import { PaymentCreateModal } from "../components/PaymentCreateModal";
import { PaymentWorkflowDialogs } from "../components/PaymentWorkflowDialogs";
import { useCreatePayment, usePayments } from "../hooks/useFinance";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentDetails,
  type PaymentMethod,
  type PaymentQueryParams,
  type PaymentStatus,
} from "../types/finance";
import type { PaymentAction } from "../utils/actions";

const PAGE_SIZE = 20;

function isPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUSES.some((status) => status === value);
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function PaymentListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const canSelectTenant =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const rawStatus = searchParams.get("status") ?? "";
  const status = isPaymentStatus(rawStatus) ? rawStatus : "";
  const rawMethod = searchParams.get("payment_method") ?? "";
  const paymentMethod = isPaymentMethod(rawMethod) ? rawMethod : "";
  const tenant = searchParams.get("tenant") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: PaymentQueryParams = {
    search: search || undefined,
    status: status || undefined,
    payment_method: paymentMethod || undefined,
    tenant: tenant || undefined,
    page,
  };
  const query = usePayments(params);
  const createMutation = useCreatePayment();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(
    null,
  );
  const [selectedAction, setSelectedAction] = useState<PaymentAction | null>(
    null,
  );

  const filters: FilterDefinition[] = [
    ...(canManage
      ? [
          {
            id: "tenant",
            label: "Tenant",
            type: "text" as const,
            value: tenant,
            placeholder: "Name or email",
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: PAYMENT_STATUSES.map((value) => ({
        value,
        label: statusLabel(value),
      })),
    },
    {
      id: "payment_method",
      label: "Payment method",
      type: "select",
      value: paymentMethod,
      options: PAYMENT_METHODS.map((value) => ({
        value,
        label: statusLabel(value),
      })),
      placeholder: "All methods",
    },
  ];

  const columns = useMemo<DataTableColumn<PaymentDetails>[]>(
    () => [
      {
        id: "reference_number",
        header: "Reference",
        sortValue: (payment) => payment.reference_number,
        render: (payment) => (
          <Link
            to={`/finance/payments/${payment.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {payment.reference_number}
          </Link>
        ),
      },
      {
        id: "tenant",
        header: "Tenant",
        sortValue: (payment) => payment.tenant_name ?? "",
        render: (payment) =>
          payment.tenant_name ?? "Tenant details unavailable",
      },
      {
        id: "amount",
        header: "Amount",
        sortValue: (payment) => Number(payment.amount),
        render: (payment) => String(payment.amount),
      },
      {
        id: "payment_date",
        header: "Payment date",
        sortValue: (payment) => payment.payment_date,
        render: (payment) => formatDate(payment.payment_date),
      },
      {
        id: "payment_method",
        header: "Method",
        sortValue: (payment) => payment.payment_method,
        render: (payment) => statusLabel(payment.payment_method),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (payment) => payment.status,
        render: (payment) => <StatusBadge status={payment.status} />,
      },
      {
        id: "receipt",
        header: "Receipt",
        sortable: false,
        render: (payment) =>
          payment.status === "COMPLETED" ? (
            <Link
              to={`/finance/receipts?payment=${payment.id}`}
              className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
            >
              View receipt
            </Link>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (payment) =>
          canManage ? (
            <PaymentActionsMenu
              payment={payment}
              onView={() =>
                navigate(`/finance/payments/${payment.id}`, {
                  state: { returnTo: `${location.pathname}${location.search}` },
                })
              }
              onAction={(action) => {
                setSelectedPayment(payment);
                setSelectedAction(action);
              }}
            />
          ) : (
            <Link
              to={`/finance/payments/${payment.id}`}
              state={{ returnTo: `${location.pathname}${location.search}` }}
              className="font-medium text-omni-blue hover:underline"
            >
              View
            </Link>
          ),
      },
    ],
    [canManage, location.pathname, location.search, navigate],
  );

  function updateParam(name: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        if (name !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function resetFilters() {
    setSearchValue("");
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="space-y-6 py-6">
      <FinanceNavigation />
      <PageHeader
        title="Payments"
        subtitle="Record tenant payments and track backend-managed allocations."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Record payment
            </Button>
          ) : undefined
        }
      />
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateParam("search", value.trim())}
        searchLabel="Search payments"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
      />
      {query.isError ? (
        <ErrorState
          title="Unable to load payments"
          description={getFinanceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Payments"
            columns={columns}
            data={query.data?.results ?? []}
            getRowId={(payment) => payment.id}
            loading={query.isLoading}
            emptyMessage={
              search || status || paymentMethod || tenant
                ? "No payments match the selected filters."
                : "No payments are available."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.count ?? 0}
            onPageChange={(nextPage) => updateParam("page", String(nextPage))}
          />
        </>
      )}
      <PaymentCreateModal
        open={createOpen}
        canSelectTenant={canSelectTenant}
        isSaving={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSave={(values) => createMutation.mutateAsync(values)}
        onSaved={() => toastService.success("Payment recorded as pending.")}
      />
      <PaymentWorkflowDialogs
        payment={selectedPayment}
        action={selectedAction}
        onClose={() => {
          setSelectedPayment(null);
          setSelectedAction(null);
        }}
      />
    </div>
  );
}
