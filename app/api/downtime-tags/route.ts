import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isDowntimeReason } from "@/lib/downtime/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const analysisId = url.searchParams.get("analysisId");
    if (!analysisId) {
      return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
    }
    const items = await getStorage().listDowntimeTags(analysisId);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      analysisId?: string;
      intervalId?: string;
      reason?: unknown;
      note?: string | null;
    };
    if (!body.analysisId || !body.intervalId) {
      return NextResponse.json(
        { error: "analysisId and intervalId are required" },
        { status: 400 },
      );
    }
    if (!isDowntimeReason(body.reason)) {
      return NextResponse.json(
        { error: "reason must be one of DowntimeReason" },
        { status: 400 },
      );
    }
    const tag = await getStorage().upsertDowntimeTag(
      body.analysisId,
      body.intervalId,
      body.reason,
      body.note ?? null,
    );
    return NextResponse.json({ item: tag });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
