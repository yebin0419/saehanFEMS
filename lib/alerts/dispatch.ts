import type { AnalysisResult } from "@/types/fems";
import { getStorage } from "@/lib/storage";
import { loadAlertConfig } from "./config";
import { evaluateViolations } from "./evaluate";
import { hasResend, sendAlertEmail } from "./email";
import type { AlertEvent, AlertViolation } from "./types";

export interface DispatchSummary {
  evaluated: number;
  sent: number;
  skipped: number;
  failed: number;
  events: AlertEvent[];
}

export async function dispatchAlerts(
  result: AnalysisResult,
  analysisId: string | null,
): Promise<DispatchSummary> {
  const storage = getStorage();
  const config = await loadAlertConfig();
  const violations = evaluateViolations(result, config);

  const summary: DispatchSummary = {
    evaluated: violations.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    events: [],
  };
  if (violations.length === 0) return summary;

  const cooldownMs = config.cooldownMinutes * 60 * 1000;
  const now = Date.now();
  const since = new Date(now - cooldownMs).toISOString();

  const toSend: AlertViolation[] = [];
  for (const v of violations) {
    if (cooldownMs > 0) {
      const existing = await storage.findRecentAlertSent(
        v.equipmentId,
        v.conditionType,
        since,
      );
      if (existing) {
        const event = await storage.insertAlertEvent({
          analysisId,
          equipmentId: v.equipmentId,
          equipmentName: v.equipmentName,
          factory: v.factory,
          conditionType: v.conditionType,
          measuredValue: v.measuredValue,
          threshold: v.threshold,
          status: "skipped_cooldown",
          errorMessage: `쿨다운 중 (이전 발송: ${existing.createdAt})`,
        });
        summary.skipped += 1;
        summary.events.push(event);
        continue;
      }
    }
    toSend.push(v);
  }

  if (toSend.length === 0) return summary;

  const canSend = hasResend() && config.recipients.length > 0;
  if (!canSend) {
    for (const v of toSend) {
      const event = await storage.insertAlertEvent({
        analysisId,
        equipmentId: v.equipmentId,
        equipmentName: v.equipmentName,
        factory: v.factory,
        conditionType: v.conditionType,
        measuredValue: v.measuredValue,
        threshold: v.threshold,
        status: hasResend() ? "no_recipients" : "failed",
        errorMessage: hasResend()
          ? "수신자가 없습니다"
          : "RESEND_API_KEY 미설정 — 이벤트만 기록",
      });
      summary.failed += 1;
      summary.events.push(event);
    }
    return summary;
  }

  try {
    await sendAlertEmail(config, toSend, analysisId);
    for (const v of toSend) {
      const event = await storage.insertAlertEvent({
        analysisId,
        equipmentId: v.equipmentId,
        equipmentName: v.equipmentName,
        factory: v.factory,
        conditionType: v.conditionType,
        measuredValue: v.measuredValue,
        threshold: v.threshold,
        status: "sent",
      });
      summary.sent += 1;
      summary.events.push(event);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    for (const v of toSend) {
      const event = await storage.insertAlertEvent({
        analysisId,
        equipmentId: v.equipmentId,
        equipmentName: v.equipmentName,
        factory: v.factory,
        conditionType: v.conditionType,
        measuredValue: v.measuredValue,
        threshold: v.threshold,
        status: "failed",
        errorMessage: message,
      });
      summary.failed += 1;
      summary.events.push(event);
    }
  }

  return summary;
}
