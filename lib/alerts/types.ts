export type AlertConditionType = "stop_duration" | "low_utilization";

export interface AlertConfig {
  maxStopMinutes: number;
  minUtilization: number;
  cooldownMinutes: number;
  recipients: string[];
}

export interface AlertViolation {
  equipmentId: string;
  equipmentName: string;
  factory: string;
  conditionType: AlertConditionType;
  measuredValue: number;
  threshold: number;
  message: string;
}

export type AlertStatus = "sent" | "skipped_cooldown" | "failed" | "no_recipients";

export interface AlertEvent {
  id: string;
  createdAt: string;
  analysisId: string | null;
  equipmentId: string;
  equipmentName: string;
  factory: string;
  conditionType: AlertConditionType;
  measuredValue: number;
  threshold: number;
  status: AlertStatus;
  errorMessage: string | null;
}

export const DEFAULT_CONFIG: AlertConfig = {
  maxStopMinutes: 60,
  minUtilization: 0.6,
  cooldownMinutes: 30,
  recipients: [],
};
