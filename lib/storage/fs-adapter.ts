import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { AnalysisResult } from "@/types/fems";
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

const ROOT = path.resolve(process.cwd(), ".data");
const DATA_DIR = path.join(ROOT, "analyses");
const CONFIG_PATH = path.join(ROOT, "alert-config.json");
const EVENTS_PATH = path.join(ROOT, "alert-events.jsonl");
const TAGS_DIR = path.join(ROOT, "downtime-tags");
const MEASUREMENTS_DIR = path.join(ROOT, "measurements");
const EQUIPMENTS_PATH = path.join(ROOT, "equipments.json");

async function ensureTagsDir() {
  await fs.mkdir(TAGS_DIR, { recursive: true });
}

async function ensureMeasurementsDir() {
  await fs.mkdir(MEASUREMENTS_DIR, { recursive: true });
}

function measurementFile(factory: string, dateIso: string): string {
  const date = dateIso.slice(0, 10);
  const safeFactory = factory.replace(/[\\/:*?"<>|]/g, "_");
  return path.join(MEASUREMENTS_DIR, `${safeFactory}__${date}.jsonl`);
}

function datesInRange(sinceIso: string, untilIso: string): string[] {
  const out: string[] = [];
  const start = new Date(sinceIso);
  const end = new Date(untilIso);
  start.setUTCHours(0, 0, 0, 0);
  while (start.getTime() <= end.getTime()) {
    out.push(start.toISOString().slice(0, 10));
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return out;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function ensureRoot() {
  await fs.mkdir(ROOT, { recursive: true });
}

function toRow(id: string, createdAt: string, r: AnalysisResult): StoredAnalysisRow {
  return {
    id,
    createdAt,
    factory: r.factory,
    from: r.from ?? null,
    to: r.to ?? null,
    equipmentCount: r.equipments.length,
    totalMinutes: r.totalMinutes,
    utilization: r.utilization,
  };
}

export const fsAdapter: AnalysisStorage = {
  async save(result) {
    await ensureDir();
    const id = nanoid(10);
    const createdAt = new Date().toISOString();
    const payload: StoredAnalysis = {
      ...toRow(id, createdAt, result),
      result,
    };
    const serializable = {
      ...payload,
      result: toSerializable(result),
    };
    await fs.writeFile(
      path.join(DATA_DIR, `${id}.json`),
      JSON.stringify(serializable),
      "utf8",
    );
    return toRow(id, createdAt, result);
  },

  async get(id) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
      const parsed = JSON.parse(raw) as StoredAnalysisRow & {
        result: SerializableAnalysisResult;
      };
      return {
        ...parsed,
        result: fromSerializable(parsed.result),
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      throw err;
    }
  },

  async list(limit = 20) {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    const rows: StoredAnalysisRow[] = [];
    for (const name of files) {
      if (!name.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
        const parsed = JSON.parse(raw) as StoredAnalysisRow;
        rows.push({
          id: parsed.id,
          createdAt: parsed.createdAt,
          factory: parsed.factory,
          from: parsed.from,
          to: parsed.to,
          equipmentCount: parsed.equipmentCount,
          totalMinutes: parsed.totalMinutes,
          utilization: parsed.utilization,
        });
      } catch {
        /* skip corrupt */
      }
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return rows.slice(0, limit);
  },

  async getAlertConfig() {
    try {
      const raw = await fs.readFile(CONFIG_PATH, "utf8");
      return JSON.parse(raw) as AlertConfig;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },

  async saveAlertConfig(config) {
    await ensureRoot();
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  },

  async listAlertEvents(limit = 100) {
    try {
      const raw = await fs.readFile(EVENTS_PATH, "utf8");
      const events = raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AlertEvent);
      events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return events.slice(0, limit);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  },

  async insertAlertEvent(event: NewAlertEvent) {
    await ensureRoot();
    const stored: AlertEvent = {
      id: nanoid(10),
      createdAt: new Date().toISOString(),
      analysisId: event.analysisId,
      equipmentId: event.equipmentId,
      equipmentName: event.equipmentName,
      factory: event.factory,
      conditionType: event.conditionType,
      measuredValue: event.measuredValue,
      threshold: event.threshold,
      status: event.status,
      errorMessage: event.errorMessage ?? null,
    };
    await fs.appendFile(EVENTS_PATH, JSON.stringify(stored) + "\n", "utf8");
    return stored;
  },

  async findRecentAlertSent(
    equipmentId: string,
    conditionType: AlertConditionType,
    sinceIso: string,
  ) {
    const events = await this.listAlertEvents(500);
    return (
      events.find(
        (e) =>
          e.equipmentId === equipmentId &&
          e.conditionType === conditionType &&
          e.status === "sent" &&
          e.createdAt >= sinceIso,
      ) ?? null
    );
  },

  async upsertDowntimeTag(
    analysisId: string,
    intervalId: string,
    reason: DowntimeReason,
    note?: string | null,
  ) {
    await ensureTagsDir();
    const file = path.join(TAGS_DIR, `${analysisId}.json`);
    let tags: DowntimeTag[] = [];
    try {
      tags = JSON.parse(await fs.readFile(file, "utf8")) as DowntimeTag[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    const now = new Date().toISOString();
    const next: DowntimeTag = {
      intervalId,
      reason,
      note: note ?? null,
      updatedAt: now,
    };
    const idx = tags.findIndex((t) => t.intervalId === intervalId);
    if (idx >= 0) tags[idx] = next;
    else tags.push(next);
    await fs.writeFile(file, JSON.stringify(tags), "utf8");
    return next;
  },

  async listDowntimeTags(analysisId: string) {
    const file = path.join(TAGS_DIR, `${analysisId}.json`);
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as DowntimeTag[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  },

  async ingestMeasurements(measurements: Measurement[]) {
    if (measurements.length === 0) return 0;
    await ensureMeasurementsDir();
    const grouped = new Map<string, string[]>();
    for (const m of measurements) {
      const file = measurementFile(m.factory, m.timestampIso);
      const arr = grouped.get(file) ?? [];
      arr.push(JSON.stringify(m));
      grouped.set(file, arr);
    }
    for (const [file, lines] of grouped) {
      await fs.appendFile(file, lines.join("\n") + "\n", "utf8");
    }
    return measurements.length;
  },

  async listMeasurements(
    factory: string | null,
    sinceIso: string,
    untilIso: string = new Date().toISOString(),
  ) {
    await ensureMeasurementsDir();
    const dates = datesInRange(sinceIso, untilIso);
    const files = await fs.readdir(MEASUREMENTS_DIR);
    const matching = files.filter((f) => {
      if (!f.endsWith(".jsonl")) return false;
      const [fileFactory, rest] = f.split("__");
      const date = rest?.replace(".jsonl", "");
      if (factory && fileFactory !== factory.replace(/[\\/:*?"<>|]/g, "_"))
        return false;
      return dates.includes(date ?? "");
    });
    const results: Measurement[] = [];
    for (const name of matching) {
      try {
        const raw = await fs.readFile(path.join(MEASUREMENTS_DIR, name), "utf8");
        for (const line of raw.split("\n")) {
          if (!line) continue;
          try {
            const m = JSON.parse(line) as Measurement;
            if (m.timestampIso >= sinceIso && m.timestampIso <= untilIso) {
              results.push(m);
            }
          } catch {
            /* skip malformed */
          }
        }
      } catch {
        /* skip missing */
      }
    }
    results.sort((a, b) => (a.timestampIso < b.timestampIso ? -1 : 1));
    return results;
  },

  async registerEquipment(eq) {
    const list = await this.listEquipments();
    const idx = list.findIndex((e) => e.id === eq.id);
    const createdAt =
      idx >= 0 ? list[idx].createdAt : new Date().toISOString();
    const next: EquipmentMaster = { ...eq, createdAt };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    await fs.mkdir(ROOT, { recursive: true });
    await fs.writeFile(EQUIPMENTS_PATH, JSON.stringify(list, null, 2), "utf8");
    return next;
  },

  async listEquipments(factory?: string | null) {
    try {
      const list = JSON.parse(await fs.readFile(EQUIPMENTS_PATH, "utf8")) as EquipmentMaster[];
      return factory ? list.filter((e) => e.factory === factory) : list;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  },
};
