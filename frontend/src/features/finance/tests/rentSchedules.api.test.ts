import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, patch, post },
}));

import {
  createRentSchedule,
  fetchRentSchedules,
  updateRentSchedule,
} from "../api/finance.api";

const schedule = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  due_day: 15,
  frequency: "MONTHLY",
  is_active: true,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RentSchedule API", () => {
  it("lists schedules using only the supported pagination parameter", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [schedule] },
    });

    await expect(fetchRentSchedules({ page: 2 })).resolves.toEqual({
      count: 1,
      results: [schedule],
    });
    expect(get).toHaveBeenCalledWith("rent-schedules/", {
      params: { page: 2 },
    });
  });

  it("creates a schedule with backend-supported fields", async () => {
    post.mockResolvedValue({ data: schedule });

    await expect(
      createRentSchedule({
        lease: schedule.lease,
        due_day: 15,
        frequency: "MONTHLY",
        is_active: true,
      }),
    ).resolves.toEqual(schedule);
    expect(post).toHaveBeenCalledWith("rent-schedules/", {
      lease: schedule.lease,
      due_day: 15,
      frequency: "MONTHLY",
      is_active: true,
    });
  });

  it("updates a schedule without attempting to reassign its lease", async () => {
    patch.mockResolvedValue({
      data: { ...schedule, is_active: false },
    });

    await expect(
      updateRentSchedule(schedule.id, {
        due_day: 15,
        frequency: "MONTHLY",
        is_active: false,
      }),
    ).resolves.toMatchObject({ id: schedule.id, is_active: false });
    expect(patch).toHaveBeenCalledWith(
      `rent-schedules/${schedule.id}/`,
      { due_day: 15, frequency: "MONTHLY", is_active: false },
    );
  });

  it("rejects a response outside the backend due-day range", async () => {
    get.mockResolvedValue({
      data: {
        count: 1,
        results: [{ ...schedule, due_day: 32 }],
      },
    });

    await expect(fetchRentSchedules()).rejects.toThrow();
  });
});
