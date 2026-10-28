export interface Measurement {
  equipmentId: string;
  factory: string;
  timestampIso: string;
  ampere: number;
}

export interface IngestInput {
  equipmentId: string;
  factory?: string;
  timestamp?: string;
  ampere: number;
}

export interface EquipmentMaster {
  id: string;
  name: string;
  factory: string;
  createdAt: string;
}

export function parseIngestInput(
  raw: unknown,
  fallbackFactory?: string,
): Measurement {
  if (!raw || typeof raw !== "object") {
    throw new Error("measurement must be an object");
  }
  const o = raw as Record<string, unknown>;
  const equipmentId = typeof o.equipmentId === "string" ? o.equipmentId.trim() : "";
  if (!equipmentId) throw new Error("equipmentId is required");

  const factory =
    (typeof o.factory === "string" && o.factory.trim()) ||
    fallbackFactory ||
    "미지정";

  const ampere = Number(o.ampere);
  if (!Number.isFinite(ampere) || ampere < 0) {
    throw new Error("ampere must be a non-negative number");
  }

  const timestampRaw = typeof o.timestamp === "string" ? o.timestamp : null;
  const ts = timestampRaw ? new Date(timestampRaw) : new Date();
  if (isNaN(ts.getTime())) {
    throw new Error("timestamp must be a valid ISO datetime");
  }

  return {
    equipmentId,
    factory,
    timestampIso: ts.toISOString(),
    ampere,
  };
}
