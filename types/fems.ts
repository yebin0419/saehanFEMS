import type { ShiftKey } from "@/lib/constants";
import type { DowntimeInterval } from "@/lib/downtime/types";

export interface EmsSample {
  t: string;
  a: number;
}

export interface EmsEquipment {
  id: string;
  name?: string;
  factory?: string;
  samples: EmsSample[];
}

export interface EmsPayload {
  meta?: {
    factory?: string;
    from?: string;
    to?: string;
  };
  equipments: EmsEquipment[];
}

export interface MoldRow {
  equipmentId: string;
  date: Date | null;
  startTime: string | number | Date | null;
  endTime: string | number | Date | null;
  quantity: number;
  department: string;
  source: string;
}

export interface Threshold {
  stop: number;
  run: number;
}

export type ThresholdMap = Record<string, Threshold>;

export interface StatusBuckets {
  run: number;
  down: number;
  stop: number;
}

export interface EquipmentAggregate {
  id: string;
  name: string;
  factory: string;
  run: number;
  down: number;
  stop: number;
  total: number;
  threshold: Threshold;
  hourly: Record<number, StatusBuckets>;
  utilization: number;
  moldQty: number;
  avgRunAmpere: number;
  downtimeIntervals: DowntimeInterval[];
}

export interface AnalysisResult {
  factory: string;
  from?: string;
  to?: string;
  equipments: EquipmentAggregate[];
  workDays: Set<string>;
  hourly: Record<number, StatusBuckets>;
  shift: Record<ShiftKey, StatusBuckets>;
  totalMinutes: number;
  totalRun: number;
  totalDown: number;
  totalStop: number;
  utilization: number;
  totalMold: number;
  moldByEq: Record<string, number>;
  moldFirst12: number;
  moldLast12: number;
}

export interface FiltersState {
  factory: string;
  equipment: string;
  shift: "" | ShiftKey;
}
