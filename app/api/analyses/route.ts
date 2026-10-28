import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { fromSerializable, type SerializableAnalysisResult } from "@/lib/storage/types";
import { dispatchAlerts } from "@/lib/alerts/dispatch";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getStorage().list(50);
    return NextResponse.json({ items: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { result?: SerializableAnalysisResult };
    if (!body?.result || !Array.isArray(body.result.equipments)) {
      return NextResponse.json(
        { error: "`result` payload is required" },
        { status: 400 },
      );
    }
    const result = fromSerializable(body.result);
    const row = await getStorage().save(result);
    let alerts = null;
    try {
      alerts = await dispatchAlerts(result, row.id);
    } catch (err) {
      alerts = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
    return NextResponse.json({ item: row, alerts }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
