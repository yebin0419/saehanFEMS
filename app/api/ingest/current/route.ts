import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isIngestAuthorized } from "@/lib/ingest/auth";
import { parseIngestInput, type Measurement } from "@/lib/ingest/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isIngestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as unknown;
    const url = new URL(req.url);
    const fallbackFactory = url.searchParams.get("factory") ?? undefined;

    const inputs: unknown[] = Array.isArray(body)
      ? body
      : body && typeof body === "object" && Array.isArray((body as { items?: unknown[] }).items)
        ? ((body as { items: unknown[] }).items)
        : [body];

    const measurements: Measurement[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    inputs.forEach((raw, i) => {
      try {
        measurements.push(parseIngestInput(raw, fallbackFactory));
      } catch (err) {
        errors.push({
          index: i,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    if (measurements.length === 0) {
      return NextResponse.json(
        { error: "No valid measurements", details: errors },
        { status: 400 },
      );
    }

    const inserted = await getStorage().ingestMeasurements(measurements);
    return NextResponse.json(
      { inserted, rejected: errors.length, errors },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
