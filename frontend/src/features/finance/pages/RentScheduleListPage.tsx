import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  type DataTableColumn,
} from "../../../components/data";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ActionDropdown } from "../../../components/overlays/ActionDropdown";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import { RentScheduleFormModal } from "../components/RentScheduleFormModal";
import { FinanceNavigation } from "../components/FinanceNavigation";
import {
  useCreateRentSchedule,
  useRentSchedules,
  useUpdateRentSchedule,
} from "../hooks/useFinance";
import type {
  RentSchedule,
  RentScheduleCreateInput,
  RentScheduleUpdateInput,
} from "../types/finance";

const PAGE_SIZE = 20;

function formatCreatedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function RentScheduleListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManageSchedules = [
    "OWNER",
    "PROPERTY_MANAGER",
    "ACCOUNTANT",
  ].includes(user?.role ?? "");
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = useRentSchedules(
    { page },
    canManageSchedules,
  );
  const createMutation = useCreateRentSchedule();
  const updateMutation = useUpdateRentSchedule();
  const updateSchedule = updateMutation.mutateAsync;
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RentSchedule | null>(
    null,
  );

  const toggleSchedule = useCallback(
    async (schedule: RentSchedule) => {
      try {
        await updateSchedule({
          id: schedule.id,
          values: {
            due_day: schedule.due_day,
            frequency: schedule.frequency,
            is_active: !schedule.is_active,
          },
        });
        toastService.success(
          schedule.is_active
            ? "Rent schedule disabled."
            : "Rent schedule activated.",
        );
      } catch (error) {
        toastService.error(getFinanceErrorMessage(error));
      }
    },
    [updateSchedule],
  );

  const columns = useMemo<DataTableColumn<RentSchedule>[]>(
    () => [
      {
        id: "lease",
        header: "Lease",
        sortValue: (schedule) => schedule.lease_label ?? "",
        render: (schedule) =>
          schedule.lease_label ?? "Lease details unavailable",
      },
      {
        id: "due_day",
        header: "Due day",
        sortValue: (schedule) => schedule.due_day,
        render: (schedule) => schedule.due_day,
      },
      {
        id: "frequency",
        header: "Frequency",
        sortValue: (schedule) => schedule.frequency,
        render: (schedule) =>
          schedule.frequency.toLowerCase().replace(/^./, (letter) =>
            letter.toUpperCase(),
          ),
      },
      {
        id: "is_active",
        header: "State",
        sortValue: (schedule) => schedule.is_active,
        render: (schedule) => (
          <StatusBadge status={schedule.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        id: "created_at",
        header: "Created",
        sortValue: (schedule) => schedule.created_at,
        render: (schedule) => formatCreatedDate(schedule.created_at),
      },
      ...(canManageSchedules
        ? [
            {
              id: "actions",
              header: "Actions",
              sortable: false,
              render: (schedule: RentSchedule) => (
                <ActionDropdown
                  label={`Rent schedule actions for ${schedule.lease_label ?? "lease"}`}
                  items={[
                    {
                      id: "edit",
                      label: "Edit schedule",
                      onSelect: () => {
                        setEditingSchedule(schedule);
                        setFormOpen(true);
                      },
                    },
                    {
                      id: "toggle",
                      label: schedule.is_active
                        ? "Disable schedule"
                        : "Activate schedule",
                      disabled: updateMutation.isPending,
                      onSelect: () => void toggleSchedule(schedule),
                    },
                  ]}
                />
              ),
            },
          ]
        : []),
    ],
    [canManageSchedules, toggleSchedule, updateMutation.isPending],
  );

  function changePage(nextPage: number) {
    setSearchParams(
      nextPage === 1 ? {} : { page: String(nextPage) },
      { replace: true },
    );
  }

  function closeForm() {
    setFormOpen(false);
    setEditingSchedule(null);
  }

  function showCreateForm() {
    setEditingSchedule(null);
    setFormOpen(true);
  }

  function handleSaved(mode: "create" | "edit") {
    toastService.success(
      mode === "create"
        ? "Rent schedule created."
        : "Rent schedule updated.",
    );
  }

  return (
    <div className="space-y-6 py-6">
      <FinanceNavigation />
      <PageHeader
        title="Rent schedules"
        subtitle="Manage monthly rent schedules for active and expiring leases."
        actions={
          canManageSchedules ? (
            <Button type="button" onClick={showCreateForm}>
              Create rent schedule
            </Button>
          ) : undefined
        }
      />
      {query.isError ? (
        <ErrorState
          title="Unable to load rent schedules"
          description={getFinanceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <LoadingState
          label="Loading rent schedules"
          message="Loading rent schedule records…"
        />
      ) : query.data && query.data.count === 0 ? (
        <EmptyState
          title="No rent schedules"
          description="Create a rent schedule first before generating rent charges."
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Rent schedules"
            columns={columns}
            data={query.data?.results ?? []}
            getRowId={(schedule) => schedule.id}
            emptyMessage="No rent schedules are available."
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.count ?? 0}
            onPageChange={changePage}
          />
        </>
      )}
      <RentScheduleFormModal
        open={formOpen}
        schedule={editingSchedule}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={closeForm}
        onCreate={(values: RentScheduleCreateInput) =>
          createMutation.mutateAsync(values)
        }
        onUpdate={(id: string, values: RentScheduleUpdateInput) =>
          updateMutation.mutateAsync({ id, values })
        }
        onSaved={handleSaved}
      />
    </div>
  );
}
