export const DOWNTIME_REASONS = [
  "BREAKDOWN",
  "MOLD_CHANGE",
  "MATERIAL_WAIT",
  "PLANNED_STOP",
  "QUALITY",
  "UNASSIGNED",
] as const;

export type DowntimeReason = (typeof DOWNTIME_REASONS)[number];

export const REASON_LABEL: Record<DowntimeReason, string> = {
  BREAKDOWN: "고장",
  MOLD_CHANGE: "금형교체",
  MATERIAL_WAIT: "자재대기",
  PLANNED_STOP: "계획정지",
  QUALITY: "품질 불량",
  UNASSIGNED: "미분류",
};

export const REASON_COLOR: Record<DowntimeReason, string> = {
  BREAKDOWN: "#ef4444",
  MOLD_CHANGE: "#8b5cf6",
  MATERIAL_WAIT: "#f59e0b",
  PLANNED_STOP: "#3b82f6",
  QUALITY: "#ec4899",
  UNASSIGNED: "#94a3b8",
};

export interface DowntimeInterval {
  id: string;
  equipmentId: string;
  startIso: string;
  endIso: string;
  durationMinutes: number;
  state: "down" | "stop";
  avgAmpere: number;
  estimatedKwhLoss: number;
}

export interface DowntimeTag {
  intervalId: string;
  reason: DowntimeReason;
  note: string | null;
  updatedAt: string;
}

export interface TaggedInterval extends DowntimeInterval {
  reason: DowntimeReason;
  note: string | null;
}

export function isDowntimeReason(v: unknown): v is DowntimeReason {
  return (
    typeof v === "string" &&
    (DOWNTIME_REASONS as readonly string[]).includes(v)
  );
}

// 기본 전기 계수 (ENV로 재정의 가능)
export const ENERGY_DEFAULTS = {
  voltage: 380,
  powerFactor: 0.9,
  phaseFactor: Math.sqrt(3),
  tariffPerKwh: 150,
};

export function estimateKwhLoss(avgAmpere: number, minutes: number): number {
  const { voltage, powerFactor, phaseFactor } = ENERGY_DEFAULTS;
  const hours = minutes / 60;
  const kw = (voltage * avgAmpere * powerFactor * phaseFactor) / 1000;
  return Number((kw * hours).toFixed(3));
}
