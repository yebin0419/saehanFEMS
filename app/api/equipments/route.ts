import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isIngestAuthorized } from "@/lib/ingest/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const factory = url.searchParams.get("factory");
    const items = await getStorage().listEquipments(factory);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isIngestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      id?: string;
      name?: string;
      factory?: string;
    };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const factory =
      typeof body.factory === "string" ? body.factory.trim() : "";
    if (!id || !name || !factory) {
      return NextResponse.json(
        { error: "id, name, factory are required" },
        { status: 400 },
      );
    }
    const item = await getStorage().registerEquipment({ id, name, factory });
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
