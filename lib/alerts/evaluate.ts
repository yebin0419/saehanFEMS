import type { AnalysisResult } from "@/types/fems";
import { fmtDuration, fmtPct } from "@/lib/format";
import type { AlertConfig, AlertViolation } from "./types";

export function evaluateViolations(
  result: AnalysisResult,
  config: AlertConfig,
): AlertViolation[] {
  const violations: AlertViolation[] = [];
  for (const eq of result.equipments) {
    if (config.maxStopMinutes > 0 && eq.stop >= config.maxStopMinutes) {
      violations.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        factory: eq.factory,
        conditionType: "stop_duration",
        measuredValue: eq.stop,
        threshold: config.maxStopMinutes,
        message: `[${eq.factory} · ${eq.name}] 정지(Stop) 누적 ${fmtDuration(
          eq.stop,
        )} ≥ 임계 ${fmtDuration(config.maxStopMinutes)}`,
      });
    }
    if (
      config.minUtilization > 0 &&
      eq.total > 0 &&
      eq.utilization < config.minUtilization
    ) {
      violations.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        factory: eq.factory,
        conditionType: "low_utilization",
        measuredValue: eq.utilization,
        threshold: config.minUtilization,
        message: `[${eq.factory} · ${eq.name}] 가동률 ${fmtPct(
          eq.utilization,
        )} < 기준 ${fmtPct(config.minUtilization)}`,
      });
    }
  }
  return violations;
}
