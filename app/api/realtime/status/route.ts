import { NextResponse } from "next/server";
import { buildLiveSnapshot } from "@/lib/ingest/build-snapshot";
import { toSerializable } from "@/lib/storage/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const factory = url.searchParams.get("factory");
    const windowHours = Math.min(
      168,
      Math.max(1, Number(url.searchParams.get("windowHours")) || 24),
    );
    const snapshot = await buildLiveSnapshot(factory, windowHours);
    return NextResponse.json({
      factory: snapshot.factory,
      windowHours: snapshot.windowHours,
      measurementCount: snapshot.measurementCount,
      lastIngestIso: snapshot.lastIngestIso,
      firstIngestIso: snapshot.firstIngestIso,
      result: toSerializable(snapshot.result),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
