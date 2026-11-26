import type {
  ApplicationAction,
  ApplicationStatus,
  ScreeningAction,
  ScreeningStatus,
} from "../types/application";

export function getApplicationAvailableActions(
  status: ApplicationStatus,
  screeningStatus?: ScreeningStatus,
): ApplicationAction[] {
  if (status === "SUBMITTED") return ["review", "withdraw"];
  if (status === "UNDER_REVIEW") return ["start-screening", "withdraw"];
  if (status === "SCREENING") {
    return screeningStatus === "PASSED"
      ? ["approve", "reject"]
      : ["reject"];
  }
  return [];
}

export function getScreeningAvailableActions(
  status: ScreeningStatus,
): ScreeningAction[] {
  if (status === "PENDING") return ["start"];
  if (status === "IN_PROGRESS") return ["pass", "fail"];
  return [];
}
