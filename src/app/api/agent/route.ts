import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { agentState } from "@/db/schema";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 45_000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = String(body?.agentId ?? "default").slice(0, 96) || "default";
    const values = {
      id,
      platform: String(body?.platform ?? "").slice(0, 32),
      version: String(body?.version ?? "").slice(0, 16),
      translated: Math.max(0, Number(body?.translated) || 0),
      chars: Math.max(0, Number(body?.chars) || 0),
      lastSeenAt: new Date(),
    };
    await db
      .insert(agentState)
      .values(values)
      .onConflictDoUpdate({
        target: agentState.id,
        set: {
          platform: values.platform,
          version: values.version,
          translated: values.translated,
          chars: values.chars,
          lastSeenAt: values.lastSeenAt,
        },
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "agent sync failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rows = await db.select().from(agentState).orderBy(desc(agentState.lastSeenAt)).limit(1);
    const row = rows[0] ?? null;
    const online = row ? Date.now() - new Date(row.lastSeenAt).getTime() < ONLINE_WINDOW_MS : false;
    return NextResponse.json({ online, agent: row });
  } catch (err) {
    return NextResponse.json(
      { online: false, agent: null, detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
