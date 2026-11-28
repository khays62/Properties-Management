import axios from "axios";

import { api } from "../../services/api";

export interface WorkflowRecord {
  id: string;
  [key: string]: unknown;
}

export interface WorkflowOption {
  label: string;
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toWorkflowRecord(value: unknown): WorkflowRecord {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("The server returned a record without a string ID.");
  }
  return { ...value, id: value.id };
}

export async function fetchWorkflowRecords(
  path: string,
): Promise<WorkflowRecord[]> {
  const response = await api.get<unknown>(path);
  const payload = response.data;
  let records: unknown[];

  if (Array.isArray(payload)) {
    records = payload;
  } else if (isRecord(payload) && Array.isArray(payload.results)) {
    records = payload.results;
  } else {
    throw new Error("The server returned an invalid collection response.");
  }

  return records.map(toWorkflowRecord);
}

export async function createWorkflowRecord(
  path: string,
  payload: Record<string, unknown>,
): Promise<WorkflowRecord> {
  const response = await api.post<unknown>(path, payload);
  return toWorkflowRecord(response.data);
}

export async function postWorkflowAction(
  path: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const response = await api.post<unknown>(path, payload);
  return response.data;
}

export function getWorkflowErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    if (isRecord(payload)) {
      if (typeof payload.detail === "string") return payload.detail;
      for (const value of Object.values(payload)) {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          const message = value.find(
            (item): item is string => typeof item === "string",
          );
          if (message) return message;
        }
      }
    }
    if (!error.response) {
      return "Unable to reach the server. Check your connection and try again.";
    }
  }
  return error instanceof Error ? error.message : "The request failed.";
}

export function getRecordText(
  record: WorkflowRecord,
  key: string,
): string {
  const value = record[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (isRecord(value)) {
    const firstName = value.first_name;
    const lastName = value.last_name;
    if (typeof firstName === "string" || typeof lastName === "string") {
      const fullName = [firstName, lastName]
        .filter((name): name is string => typeof name === "string")
        .join(" ")
        .trim();
      if (fullName) return fullName;
    }
    const preferred = ["name", "title", "email", "unit_number"];
    for (const field of preferred) {
      const nestedValue = value[field];
      if (typeof nestedValue === "string" || typeof nestedValue === "number") {
        return String(nestedValue);
      }
    }
  }
  return "—";
}

export function getRecordValue(record: WorkflowRecord, key: string): unknown {
  return record[key];
}

export function getNestedRecordText(
  record: WorkflowRecord,
  parentKey: string,
  key: string,
): string {
  const parent = record[parentKey];
  if (!isRecord(parent)) return "—";
  const value = parent[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "—";
}

export function toOptions(
  records: readonly WorkflowRecord[],
  labelKey: string,
  prefix?: string,
): WorkflowOption[] {
  return records.map((record) => ({
    label: `${prefix ?? ""}${getRecordText(record, labelKey)}`,
    value: record.id,
  }));
}
