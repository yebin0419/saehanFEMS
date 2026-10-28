import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { dispatchAlerts } from "@/lib/alerts/dispatch";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const explicitId = url.searchParams.get("analysisId");
    const storage = getStorage();

    let analysisId = explicitId;
    if (!analysisId) {
      const [latest] = await storage.list(1);
      analysisId = latest?.id ?? null;
    }
    if (!analysisId) {
      return NextResponse.json({ error: "No analysis available to evaluate" }, { status: 404 });
    }
    const stored = await storage.get(analysisId);
    if (!stored) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const summary = await dispatchAlerts(stored.result, stored.id);
    return NextResponse.json({ analysisId: stored.id, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Vercel Cron hits GET. Reuse POST handler semantics.
  return POST(req);
}
