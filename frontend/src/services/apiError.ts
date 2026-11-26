import axios from "axios";
import { z } from "zod";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    if (typeof payload === "string") return payload;
    if (typeof payload === "object" && payload !== null) {
      if ("detail" in payload && typeof payload.detail === "string") {
        return payload.detail;
      }
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
  if (error instanceof z.ZodError) {
    return "The server returned data in an unexpected format.";
  }
  return error instanceof Error ? error.message : "The request failed.";
}
