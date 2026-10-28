import type { EmsPayload } from "@/types/fems";
import { analyze } from "@/lib/aggregate";
import { autoThresholds } from "@/lib/thresholds";
import { getStorage } from "@/lib/storage";
import type { EquipmentMaster, Measurement } from "./types";

export interface LiveSnapshot {
  factory: string;
  windowHours: number;
  measurementCount: number;
  lastIngestIso: string | null;
  firstIngestIso: string | null;
  result: ReturnType<typeof analyze>;
}

export async function buildLiveSnapshot(
  factory: string | null,
  windowHours: number,
): Promise<LiveSnapshot> {
  const storage = getStorage();
  const until = new Date();
  const since = new Date(until.getTime() - windowHours * 60 * 60 * 1000);

  const measurements = await storage.listMeasurements(
    factory,
    since.toISOString(),
    until.toISOString(),
  );
  const registry = await storage.listEquipments(factory);
  const registryById = new Map<string, EquipmentMaster>();
  for (const e of registry) registryById.set(e.id, e);

  const grouped = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const arr = grouped.get(m.equipmentId) ?? [];
    arr.push(m);
    grouped.set(m.equipmentId, arr);
  }

  const resolvedFactory =
    factory ?? measurements[0]?.factory ?? registry[0]?.factory ?? "미지정";

  const payload: EmsPayload = {
    meta: {
      factory: resolvedFactory,
      from: since.toISOString(),
      to: until.toISOString(),
    },
    equipments: Array.from(grouped.entries()).map(([id, items]) => ({
      id,
      name: registryById.get(id)?.name || id,
      factory: registryById.get(id)?.factory || items[0]?.factory,
      samples: items.map((m) => ({ t: m.timestampIso, a: m.ampere })),
    })),
  };

  const thresholds = autoThresholds(payload);
  const result = analyze(payload, [], thresholds);

  return {
    factory: resolvedFactory,
    windowHours,
    measurementCount: measurements.length,
    lastIngestIso: measurements.at(-1)?.timestampIso ?? null,
    firstIngestIso: measurements[0]?.timestampIso ?? null,
    result,
  };
}
