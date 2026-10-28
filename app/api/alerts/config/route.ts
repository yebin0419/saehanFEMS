import { NextResponse } from "next/server";
import { loadAlertConfig, persistAlertConfig, validateAlertConfig } from "@/lib/alerts/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await loadAlertConfig();
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const config = validateAlertConfig(body);
    await persistAlertConfig(config);
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
