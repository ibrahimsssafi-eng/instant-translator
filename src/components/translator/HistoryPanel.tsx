"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, History, MoveLeft, Trash2 } from "lucide-react";
import { HISTORY_EVENT, cn } from "@/lib/client";

interface Item {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  mode: string;
  createdAt: string;
}

const numFmt = new Intl.NumberFormat("ar-EG");
const timeFmt = new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" });

const MODE_LABEL: Record<string, string> = {
  auto: "تلقائي",
  manual: "استبدال",
  copy: "نسخ",
  send: "إرسال",
};

function when(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "الآن";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return timeFmt.format(d);
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
}

export default function HistoryPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({ total: 0, totalChars: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const json = (await res.json()) as { items?: Item[]; total?: number; totalChars?: number };
      if (res.ok) {
        setItems(json.items ?? []);
        setStats({ total: json.total ?? 0, totalChars: json.totalChars ?? 0 });
      }
    } catch {
      /* keep old state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener(HISTORY_EVENT, handler);
    return () => window.removeEventListener(HISTORY_EVENT, handler);
  }, [load]);

  const clearAll = async () => {
    setItems([]);
    setStats({ total: 0, totalChars: 0 });
    try {
      await fetch("/api/history", { method: "DELETE" });
    } catch {
      /* ignore */
    }
  };

  const copyItem = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.translatedText);
    } catch {
      /* blocked */
    }
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 1300);
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <History className="h-4 w-4" />
            ذاكرة المترجم
          </p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            سجل <span className="gradient-text">الترجمات</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
            يُحفظ تلقائيًا عند كل استبدال أو نسخ أو إرسال —{" "}
            <span className="font-semibold text-white/75">{numFmt.format(stats.total)}</span> ترجمة و{" "}
            <span className="font-semibold text-white/75">{numFmt.format(stats.totalChars)}</span>{" "}
            حرفًا حتى الآن.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => void clearAll()}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-400/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            مسح السجل بالكامل
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] backdrop-blur-xl">
        {loading ? (
          <div className="space-y-4 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-5/12 animate-pulse rounded-full bg-white/[.06]" />
                <div className="size-6 shrink-0 animate-pulse rounded-full bg-white/[.06]" />
                <div className="h-4 w-5/12 animate-pulse rounded-full bg-white/[.06]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full border border-dashed border-white/15 text-white/25">
              <History className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-bold text-white/60">سجلّك فارغ حتى الآن</p>
              <p className="mt-1.5 max-w-72 text-xs leading-relaxed text-white/35">
                اكتب بالعربية في المحرر أو داخل التطبيقات التجريبية، وستظهر ترجماتك هنا فور استخدامها
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 border-b border-white/[.06] px-5 py-4 transition last:border-b-0 hover:bg-white/[.03] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6"
              >
                <p className="truncate text-sm font-medium text-white/80" title={item.sourceText}>
                  {item.sourceText}
                </p>
                <span className="hidden size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 sm:grid">
                  <MoveLeft className="h-3.5 w-3.5 text-cyan-300/80" />
                </span>
                <p
                  dir="ltr"
                  className="font-en truncate text-left text-sm text-cyan-100/85"
                  title={item.translatedText}
                >
                  {item.translatedText}
                </p>
                <div className="flex items-center gap-2 sm:justify-end">
                  <span
                    dir="ltr"
                    className="font-en rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/50"
                  >
                    {item.sourceLang.toUpperCase()}→{item.targetLang.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] font-bold",
                      item.mode === "auto"
                        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                        : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                    )}
                  >
                    {MODE_LABEL[item.mode] ?? item.mode}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-white/35">
                    {when(item.createdAt)}
                  </span>
                  <button
                    type="button"
                    title="نسخ الترجمة"
                    aria-label="نسخ الترجمة"
                    onClick={() => void copyItem(item)}
                    className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
