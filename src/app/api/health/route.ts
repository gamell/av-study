import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

/**
 * Liveness + readiness probe. Runs migrations+seed on first call (so a fresh
 * container's healthcheck also doubles as the init signal) and then verifies
 * we can query the cards table. Intended for Docker / orchestrator probes.
 */
export async function GET() {
  try {
    await ensureDatabase();
    const [{ total }] = await db.select({ total: count() }).from(cards);
    return NextResponse.json(
      { status: "ok", cards: total },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
