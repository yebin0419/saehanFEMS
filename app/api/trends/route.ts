import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const factory = url.searchParams.get("factory") || null;
    const limit = Number(url.searchParams.get("limit")) || 30;

    const rows = await getStorage().list(200);
    const filtered = factory ? rows.filter((r) => r.factory === factory) : rows;
    const items = filtered
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .slice(-limit);

    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
