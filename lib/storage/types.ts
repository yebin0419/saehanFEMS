import type { AnalysisResult } from "@/types/fems";
import type {
  AlertConfig,
  AlertConditionType,
  AlertEvent,
  AlertStatus,
} from "@/lib/alerts/types";
import type { DowntimeReason, DowntimeTag } from "@/lib/downtime/types";
import type { EquipmentMaster, Measurement } from "@/lib/ingest/types";

export interface StoredAnalysisRow {
  id: string;
  createdAt: string;
  factory: string;
  from: string | null;
  to: string | null;
  equipmentCount: number;
  totalMinutes: number;
  utilization: number;
}

export interface StoredAnalysis extends StoredAnalysisRow {
  result: AnalysisResult;
}

export interface NewAlertEvent {
  analysisId: string | null;
  equipmentId: string;
  equipmentName: string;
  factory: string;
  conditionType: AlertConditionType;
  measuredValue: number;
  threshold: number;
  status: AlertStatus;
  errorMessage?: string | null;
}

export interface AnalysisStorage {
  save(result: AnalysisResult): Promise<StoredAnalysisRow>;
  get(id: string): Promise<StoredAnalysis | null>;
  list(limit?: number): Promise<StoredAnalysisRow[]>;

  getAlertConfig(): Promise<AlertConfig | null>;
  saveAlertConfig(config: AlertConfig): Promise<void>;

  listAlertEvents(limit?: number): Promise<AlertEvent[]>;
  insertAlertEvent(event: NewAlertEvent): Promise<AlertEvent>;
  findRecentAlertSent(
    equipmentId: string,
    conditionType: AlertConditionType,
    sinceIso: string,
  ): Promise<AlertEvent | null>;

  upsertDowntimeTag(
    analysisId: string,
    intervalId: string,
    reason: DowntimeReason,
    note?: string | null,
  ): Promise<DowntimeTag>;
  listDowntimeTags(analysisId: string): Promise<DowntimeTag[]>;

  ingestMeasurements(measurements: Measurement[]): Promise<number>;
  listMeasurements(
    factory: string | null,
    sinceIso: string,
    untilIso?: string,
  ): Promise<Measurement[]>;

  registerEquipment(eq: Omit<EquipmentMaster, "createdAt">): Promise<EquipmentMaster>;
  listEquipments(factory?: string | null): Promise<EquipmentMaster[]>;
}

export interface SerializableAnalysisResult extends Omit<AnalysisResult, "workDays"> {
  workDays: string[];
}

export function toSerializable(r: AnalysisResult): SerializableAnalysisResult {
  return { ...r, workDays: [...r.workDays] };
}

export function fromSerializable(
  r: SerializableAnalysisResult,
): AnalysisResult {
  return { ...r, workDays: new Set(r.workDays) };
}
