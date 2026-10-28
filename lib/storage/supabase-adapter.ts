import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import {
  type AnalysisStorage,
  type NewAlertEvent,
  type StoredAnalysis,
  type StoredAnalysisRow,
  toSerializable,
  fromSerializable,
  type SerializableAnalysisResult,
} from "./types";
import type {
  AlertConfig,
  AlertConditionType,
  AlertEvent,
} from "@/lib/alerts/types";
import type { DowntimeReason, DowntimeTag } from "@/lib/downtime/types";
import type { EquipmentMaster, Measurement } from "@/lib/ingest/types";

const TABLE = "fems_analyses";
const CONFIG_TABLE = "fems_alert_config";
const EVENTS_TABLE = "fems_alert_events";
const TAGS_TABLE = "fems_downtime_tags";
const MEASUREMENTS_TABLE = "fems_measurements";
const EQUIPMENTS_TABLE = "fems_equipments";
const CONFIG_SINGLETON_ID = "default";

interface AlertEventRow {
  id: string;
  created_at: string;
  analysis_id: string | null;
  equipment_id: string;
  equipment_name: string;
  factory: string;
  condition_type: AlertConditionType;
  measured_value: number;
  threshold: number;
  status: AlertEvent["status"];
  error_message: string | null;
}

function toAlertEvent(r: AlertEventRow): AlertEvent {
  return {
    id: r.id,
    createdAt: r.created_at,
    analysisId: r.analysis_id,
    equipmentId: r.equipment_id,
    equipmentName: r.equipment_name,
    factory: r.factory,
    conditionType: r.condition_type,
    measuredValue: r.measured_value,
    threshold: r.threshold,
    status: r.status,
    errorMessage: r.error_message,
  };
}

interface Row {
  id: string;
  created_at: string;
  factory: string;
  period_from: string | null;
  period_to: string | null;
  equipment_count: number;
  total_minutes: number;
  utilization: number;
  payload: SerializableAnalysisResult;
}

function rowToSummary(r: Omit<Row, "payload">): StoredAnalysisRow {
  return {
    id: r.id,
    createdAt: r.created_at,
    factory: r.factory,
    from: r.period_from,
    to: r.period_to,
    equipmentCount: r.equipment_count,
    totalMinutes: r.total_minutes,
    utilization: r.utilization,
  };
}

export function createSupabaseAdapter(url: string, key: string): AnalysisStorage {
  const client: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return {
    async save(result) {
      const id = nanoid(10);
      const createdAt = new Date().toISOString();
      const row: Row = {
        id,
        created_at: createdAt,
        factory: result.factory,
        period_from: result.from ?? null,
        period_to: result.to ?? null,
        equipment_count: result.equipments.length,
        total_minutes: result.totalMinutes,
        utilization: result.utilization,
        payload: toSerializable(result),
      };
      const { error } = await client.from(TABLE).insert(row);
      if (error) throw new Error(error.message);
      return rowToSummary(row);
    },

    async get(id) {
      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle<Row>();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const stored: StoredAnalysis = {
        ...rowToSummary(data),
        result: fromSerializable(data.payload),
      };
      return stored;
    },

    async list(limit = 20) {
      const { data, error } = await client
        .from(TABLE)
        .select(
          "id, created_at, factory, period_from, period_to, equipment_count, total_minutes, utilization",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => rowToSummary(r as Omit<Row, "payload">));
    },

    async getAlertConfig() {
      const { data, error } = await client
        .from(CONFIG_TABLE)
        .select("payload")
        .eq("id", CONFIG_SINGLETON_ID)
        .maybeSingle<{ payload: AlertConfig }>();
      if (error) throw new Error(error.message);
      return data?.payload ?? null;
    },

    async saveAlertConfig(config) {
      const { error } = await client
        .from(CONFIG_TABLE)
        .upsert({ id: CONFIG_SINGLETON_ID, payload: config, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },

    async listAlertEvents(limit = 100) {
      const { data, error } = await client
        .from(EVENTS_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => toAlertEvent(r as AlertEventRow));
    },

    async insertAlertEvent(event: NewAlertEvent) {
      const row: AlertEventRow = {
        id: nanoid(10),
        created_at: new Date().toISOString(),
        analysis_id: event.analysisId,
        equipment_id: event.equipmentId,
        equipment_name: event.equipmentName,
        factory: event.factory,
        condition_type: event.conditionType,
        measured_value: event.measuredValue,
        threshold: event.threshold,
        status: event.status,
        error_message: event.errorMessage ?? null,
      };
      const { error } = await client.from(EVENTS_TABLE).insert(row);
      if (error) throw new Error(error.message);
      return toAlertEvent(row);
    },

    async findRecentAlertSent(equipmentId, conditionType, sinceIso) {
      const { data, error } = await client
        .from(EVENTS_TABLE)
        .select("*")
        .eq("equipment_id", equipmentId)
        .eq("condition_type", conditionType)
        .eq("status", "sent")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AlertEventRow>();
      if (error) throw new Error(error.message);
      return data ? toAlertEvent(data) : null;
    },

    async upsertDowntimeTag(analysisId, intervalId, reason, note) {
      const now = new Date().toISOString();
      const row = {
        analysis_id: analysisId,
        interval_id: intervalId,
        reason,
        note: note ?? null,
        updated_at: now,
      };
      const { error } = await client
        .from(TAGS_TABLE)
        .upsert(row, { onConflict: "analysis_id,interval_id" });
      if (error) throw new Error(error.message);
      return { intervalId, reason, note: note ?? null, updatedAt: now };
    },

    async listDowntimeTags(analysisId) {
      const { data, error } = await client
        .from(TAGS_TABLE)
        .select("interval_id, reason, note, updated_at")
        .eq("analysis_id", analysisId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => {
        const row = r as {
          interval_id: string;
          reason: DowntimeReason;
          note: string | null;
          updated_at: string;
        };
        return {
          intervalId: row.interval_id,
          reason: row.reason,
          note: row.note,
          updatedAt: row.updated_at,
        } satisfies DowntimeTag;
      });
    },

    async ingestMeasurements(measurements) {
      if (measurements.length === 0) return 0;
      const rows = measurements.map((m) => ({
        equipment_id: m.equipmentId,
        factory: m.factory,
        timestamp: m.timestampIso,
        ampere: m.ampere,
      }));
      const { error } = await client.from(MEASUREMENTS_TABLE).insert(rows);
      if (error) throw new Error(error.message);
      return measurements.length;
    },

    async listMeasurements(factory, sinceIso, untilIso) {
      let q = client
        .from(MEASUREMENTS_TABLE)
        .select("equipment_id, factory, timestamp, ampere")
        .gte("timestamp", sinceIso)
        .order("timestamp", { ascending: true })
        .limit(100000);
      if (factory) q = q.eq("factory", factory);
      if (untilIso) q = q.lte("timestamp", untilIso);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => {
        const row = r as {
          equipment_id: string;
          factory: string;
          timestamp: string;
          ampere: number;
        };
        return {
          equipmentId: row.equipment_id,
          factory: row.factory,
          timestampIso: row.timestamp,
          ampere: row.ampere,
        } satisfies Measurement;
      });
    },

    async registerEquipment(eq) {
      const createdAt = new Date().toISOString();
      const row = {
        id: eq.id,
        name: eq.name,
        factory: eq.factory,
        created_at: createdAt,
      };
      const { error } = await client
        .from(EQUIPMENTS_TABLE)
        .upsert(row, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return { ...eq, createdAt };
    },

    async listEquipments(factory) {
      let q = client
        .from(EQUIPMENTS_TABLE)
        .select("id, name, factory, created_at")
        .order("created_at", { ascending: true });
      if (factory) q = q.eq("factory", factory);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => {
        const row = r as {
          id: string;
          name: string;
          factory: string;
          created_at: string;
        };
        return {
          id: row.id,
          name: row.name,
          factory: row.factory,
          createdAt: row.created_at,
        } satisfies EquipmentMaster;
      });
    },
  };
}
