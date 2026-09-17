import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { translations } from "@/db/schema";

export const dynamic = "force-dynamic";

const MODES = ["auto", "manual", "copy", "send"] as const;

type Mode = (typeof MODES)[number];

export async function GET() {
  try {
    const items = await db
      .select()
      .from(translations)
      .orderBy(desc(translations.createdAt))
      .limit(30);
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        chars: sql<number>`coalesce(sum(${translations.chars}), 0)::int`,
      })
      .from(translations);
    return NextResponse.json({
      items,
      total: stats?.total ?? 0,
      totalChars: stats?.chars ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "تعذّر تحميل السجل", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const source = String(body?.source ?? "").slice(0, 2000);
    const translated = String(body?.translated ?? "").slice(0, 2000);
    const from = String(body?.from ?? "auto").slice(0, 8);
    const to = String(body?.to ?? "en").slice(0, 8);
    const mode: Mode = MODES.includes(body?.mode as Mode) ? (body?.mode as Mode) : "manual";

    if (!source.trim() || !translated.trim() || source.trim() === translated.trim()) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const [row] = await db
      .insert(translations)
      .values({
        sourceText: source,
        translatedText: translated,
        sourceLang: from,
        targetLang: to,
        mode,
        chars: source.length,
      })
      .returning();
    return NextResponse.json({ ok: true, item: row });
  } catch (err) {
    return NextResponse.json(
      { error: "تعذّر حفظ الترجمة", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      await db.delete(translations).where(eq(translations.id, id));
    } else {
      await db.delete(translations);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "تعذّر حذف السجل", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
