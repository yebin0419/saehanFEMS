import { getStorage } from "@/lib/storage";
import { DEFAULT_CONFIG, type AlertConfig } from "./types";

export async function loadAlertConfig(): Promise<AlertConfig> {
  const stored = await getStorage().getAlertConfig();
  if (stored) return stored;
  const envRecipients = (process.env.ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...DEFAULT_CONFIG, recipients: envRecipients };
}

export async function persistAlertConfig(config: AlertConfig): Promise<void> {
  await getStorage().saveAlertConfig(config);
}

export function validateAlertConfig(input: unknown): AlertConfig {
  if (!input || typeof input !== "object") {
    throw new Error("config payload is required");
  }
  const o = input as Record<string, unknown>;
  const maxStopMinutes = Number(o.maxStopMinutes);
  const minUtilization = Number(o.minUtilization);
  const cooldownMinutes = Number(o.cooldownMinutes);
  const recipients = Array.isArray(o.recipients)
    ? (o.recipients.filter((r) => typeof r === "string" && r.trim()) as string[])
    : [];
  if (!Number.isFinite(maxStopMinutes) || maxStopMinutes < 0) {
    throw new Error("maxStopMinutes must be a non-negative number");
  }
  if (!Number.isFinite(minUtilization) || minUtilization < 0 || minUtilization > 1) {
    throw new Error("minUtilization must be between 0 and 1");
  }
  if (!Number.isFinite(cooldownMinutes) || cooldownMinutes < 0) {
    throw new Error("cooldownMinutes must be a non-negative number");
  }
  return { maxStopMinutes, minUtilization, cooldownMinutes, recipients };
}
