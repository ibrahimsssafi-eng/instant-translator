"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn, saveHistory } from "@/lib/client";
import { dirOf, hasArabic } from "@/lib/langs";
import { useInstant } from "@/hooks/useInstant";
import { useAutoReplace } from "@/hooks/useAutoReplace";

type Shared = { auto: boolean; target: string };
type TabId = "search" | "mail" | "chat";

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "search", label: "محرك البحث", icon: Search },
  { id: "mail", label: "البريد", icon: Mail },
  { id: "chat", label: "المحادثة", icon: MessageCircle },
];

export default function Playground({ auto, target }: Shared) {
  const [tab, setTab] = useState<TabId>("search");

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0a0d14]/80 shadow-[0_40px_120px_-40px_rgba(168,85,247,.18)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-fuchsia-400/50 to-transparent" />

      {/* Window title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <span className="size-3 rounded-full bg-rose-400/80" />
        <span className="size-3 rounded-full bg-amber-300/80" />
        <span className="size-3 rounded-full bg-emerald-400/80" />
        <span className="ms-3 text-xs font-medium text-white/40">سطح المكتب — بيئة تجريبية حيّة</span>
        <div className="ms-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
          <span
            className={cn(
              "size-1.5 rounded-full",
              auto ? "animate-pulse bg-emerald-400" : "bg-white/30"
            )}
          />
          المترجم {auto ? "نشِط" : "يدوي"}
          <span className="font-en text-white/35">· AR → {target.toUpperCase().slice(0, 2)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 pt-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 cursor-pointer items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition",
                active ? "bg-white/[.06] text-white" : "text-white/45 hover:text-white/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-l from-cyan-300 to-fuchsia-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-[440px] p-5 sm:p-7">
        {tab === "search" && <SearchApp auto={auto} target={target} />}
        {tab === "mail" && <MailApp auto={auto} target={target} />}
        {tab === "chat" && <ChatApp auto={auto} target={target} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SmartField — input that watches Arabic keystrokes and replaces
   them with the live translation inside the field itself.
   ──────────────────────────────────────────────────────────────── */
function SmartField({
  value,
  onChange,
  placeholder,
  auto,
  target,
  multiline,
  rows,
  className,
  inputClassName,
  onEnter,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  auto: boolean;
  target: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  onEnter?: () => void;
  ariaLabel?: string;
}) {
  const ar = hasArabic(value);
  const { text: out, loading } = useInstant(value, "auto", target, {
    delay: 450,
    enabled: ar,
  });
  const repl = useAutoReplace({
    value,
    setValue: onChange,
    translated: out,
    loading,
    enabled: auto && ar,
    dwellMs: 700,
    onReplaced: (e) => {
      void saveHistory({ source: e.from, translated: e.to, from: "ar", to: target, mode: e.mode });
    },
  });

  const showBubble = ar && (loading || !!out.trim());
  const sharedClass = cn(
    "w-full resize-none border border-white/10 bg-white/[.05] text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/40 focus:bg-white/[.08] focus:shadow-[0_0_0_4px_rgba(34,211,238,.08)]",
    inputClassName
  );

  const keyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (repl.canReplace) repl.replaceNow();
    } else if (!multiline && e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    }
  };

  return (
    <div className={cn("relative", className)}>
      {showBubble && (
        <div className="pointer-events-none absolute inset-x-6 -top-3 z-20 flex -translate-y-full justify-center">
          <div className="animate-pop flex max-w-full items-center gap-2 rounded-xl border border-cyan-300/25 bg-[#0b1322]/95 px-3 py-1.5 shadow-[0_10px_30px_rgba(2,6,17,.6)] backdrop-blur-md">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300" />
            ) : (
              <Zap className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            )}
            <span
              dir={dirOf(target)}
              className="font-en max-w-56 truncate text-[13px] text-cyan-100/90"
            >
              {loading ? "…" : out}
            </span>
            {!loading && (
              <kbd className="font-en shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
                Tab
              </kbd>
            )}
          </div>
        </div>
      )}

      {multiline ? (
        <textarea
          value={value}
          rows={rows ?? 4}
          onChange={(e) => repl.handleChange(e.target.value)}
          onKeyDown={keyDown}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={sharedClass}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => repl.handleChange(e.target.value)}
          onKeyDown={keyDown}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={sharedClass}
        />
      )}

      {repl.flash > 0 && (
        <span key={repl.flash} className="animate-fieldflash pointer-events-none absolute inset-0" />
      )}

      {repl.original && !ar && (
        <button
          type="button"
          onClick={repl.restore}
          title={repl.original}
          className="absolute bottom-2 start-2 z-10 flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-semibold text-white/55 backdrop-blur transition hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          استرجاع الأصل
        </button>
      )}
    </div>
  );
}

/* ── Search ─────────────────────────────────────────────────── */
const slug = (s: string) =>
  encodeURIComponent(s.trim().toLowerCase().replace(/\s+/g, "-")).slice(0, 48);

function SearchApp({ auto, target }: Shared) {
  const [q, setQ] = useState("");
  const ar = hasArabic(q);
  const searched = !ar && q.trim().length > 0;

  const results = searched
    ? [
        {
          url: `www.guidehub.com/${slug(q)}`,
          title: `${q.trim()} — Complete Guide 2026`,
          desc: `Everything you need to know about “${q.trim()}”. Updated daily with expert insights, comparisons and data.`,
        },
        {
          url: `www.lexipedia.org/wiki/${slug(q)}`,
          title: `What is ${q.trim()}? Definition & Examples`,
          desc: `${q.trim()} explained simply: history, usage, and why it matters right now.`,
        },
        {
          url: `trendradar.io/topics/${slug(q)}`,
          title: `Top 10 ${q.trim()} Trends This Week`,
          desc: `Data-driven ranking of the most searched topics related to “${q.trim()}”.`,
        },
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-5">
      <div className="mb-6 select-none text-2xl font-black tracking-tight sm:text-3xl">
        <span className="gradient-text">وَصال</span>
        <span className="text-white/85"> سيرش</span>
      </div>

      <div className="relative w-full">
        <Search className="pointer-events-none absolute start-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
        <SmartField
          value={q}
          onChange={setQ}
          auto={auto}
          target={target}
          placeholder="اكتب بالعربية — مثلًا: أخبار الذكاء الاصطناعي اليوم"
          className="w-full"
          inputClassName="h-[52px] rounded-full ps-11 pe-5"
          ariaLabel="حقل البحث"
        />
      </div>

      <div className="mt-3 flex h-5 items-center">
        {ar ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-200/80">
            <Zap className="h-3.5 w-3.5" />
            سيُستبدل نصّك بالترجمة {auto ? "تلقائيًا خلال لحظات" : "— اضغط Tab للاستبدال"}
          </p>
        ) : searched ? (
          <p className="text-[11px] text-white/40">
            نتائج تقريبية لعبارة «<span className="font-en" dir="ltr">{q.trim()}</span>» — بيئة عرض تجريبية
          </p>
        ) : (
          <p className="text-xs text-white/30">جرّب أن تكتب: أخبار التقنية اليوم</p>
        )}
      </div>

      <div className="mt-4 w-full space-y-3">
        {results.map((r, i) => (
          <div
            key={r.url}
            className="animate-fadeup cursor-pointer rounded-2xl border border-white/[.07] bg-white/[.03] p-4 transition hover:border-cyan-300/25 hover:bg-white/[.05]"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <p dir="ltr" className="font-en text-left text-[11px] text-emerald-300/70">
              {r.url}
            </p>
            <p dir="ltr" className="font-en mt-0.5 text-left text-[15px] font-semibold text-sky-300">
              {r.title}
            </p>
            <p dir="ltr" className="font-en mt-1 text-left text-xs leading-relaxed text-white/45">
              {r.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mail ───────────────────────────────────────────────────── */
function MailApp({ auto, target }: Shared) {
  const [to, setTo] = useState("sara@northwind.io");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = () => {
    setSending(true);
    if (hasArabic(subject) || hasArabic(body)) {
      void saveHistory({
        source: [subject, body].filter(Boolean).join(" — ").slice(0, 400),
        translated: "…translated draft",
        from: "ar",
        to: target,
        mode: "send",
      });
    }
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };

  const reset = () => {
    setSubject("");
    setBody("");
    setSent(false);
  };

  if (sent) {
    return (
      <div className="animate-pop mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        </span>
        <h3 className="mt-5 text-xl font-extrabold">أُرسل بريدك بنجاح</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          كتبتَه بالعربية، ووصل باللغة {target === "ar" ? "المختارة" : "الإنجليزية"} — المترجم الفوري
          تكفّل بالباقي داخل حقول النموذج.
        </p>
        {subject.trim() && (
          <p dir="ltr" className="font-en mt-4 max-w-full truncate rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {subject}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 cursor-pointer rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10"
        >
          مسودة جديدة
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-indigo-500 text-xs font-black text-white">
          س
        </span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="إلى"
          dir="ltr"
          className="font-en w-full bg-transparent text-left text-sm text-white/80 outline-none placeholder:text-white/25"
          placeholder="to@example.com"
        />
        <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/40">
          إلى
        </span>
      </div>

      <SmartField
        value={subject}
        onChange={setSubject}
        auto={auto}
        target={target}
        placeholder="الموضوع بالعربية — سيُترجم داخل الحقل مباشرة"
        inputClassName="rounded-2xl px-4 py-3.5"
        ariaLabel="موضوع الرسالة"
      />

      <SmartField
        value={body}
        onChange={setBody}
        auto={auto}
        target={target}
        multiline
        rows={6}
        placeholder="اكتب نصّ رسالتك هنا بالعربية… المترجم يحوّلها في مكانها فور توقّفك عن الكتابة."
        className="mt-4"
        inputClassName="rounded-2xl px-4 py-3.5 leading-relaxed pb-12"
        ariaLabel="نص الرسالة"
      />

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sending || (!subject.trim() && !body.trim())}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-400 to-indigo-500 px-6 py-3 text-sm font-black text-[#07080d] shadow-[0_10px_30px_-10px_rgba(34,211,238,.5)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
          {sending ? "جارٍ الإرسال…" : "إرسال الآن"}
        </button>
        <span className="text-[11px] leading-relaxed text-white/35">
          تُرسل النسخة المترجمة دائمًا — الأصل العربي يبقى قابلًا للاسترجاع أثناء الكتابة
        </span>
      </div>
    </div>
  );
}

/* ── Chat ───────────────────────────────────────────────────── */
interface Msg {
  id: number;
  me: boolean;
  text: string;
  orig?: string;
}

const REPLIES = [
  "Sounds good — let's sync right before the call.",
  "Perfect, I'll update the shared doc now.",
  "Great! Sending you the calendar invite.",
  "Nice one. The client will love this.",
];

function ChatApp({ auto, target }: Shared) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, me: false, text: "Hey! The client call moved to 5 PM — are we still on?" },
  ]);
  const [msg, setMsg] = useState("");
  const replyIdx = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const ar = hasArabic(msg);
  const { text: out, loading } = useInstant(msg, "auto", target, {
    delay: 400,
    enabled: ar,
  });
  const repl = useAutoReplace({
    value: msg,
    setValue: setMsg,
    translated: out,
    loading,
    enabled: auto && ar,
    dwellMs: 700,
    onReplaced: (e) => {
      void saveHistory({ source: e.from, translated: e.to, from: "ar", to: target, mode: e.mode });
    },
  });

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const raw = msg.trim();
    if (!raw) return;
    const wasAr = hasArabic(raw);
    const finalText = wasAr && out.trim() ? out : raw;
    setMessages((m) => [
      ...m,
      {
        id: Date.now(),
        me: true,
        text: finalText,
        orig: wasAr && finalText !== raw ? raw : undefined,
      },
    ]);
    if (wasAr && out.trim()) {
      void saveHistory({ source: raw, translated: out, from: "ar", to: target, mode: "send" });
    }
    setMsg("");
    const reply = REPLIES[replyIdx.current % REPLIES.length];
    replyIdx.current += 1;
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, me: false, text: reply }]);
    }, 1300);
  };

  return (
    <div className="mx-auto flex h-[420px] max-w-xl flex-col">
      {/* contact header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-black text-[#07080d]">
          SR
          <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full border-2 border-[#0a0d14] bg-emerald-400" />
        </span>
        <div className="leading-tight">
          <p className="font-en text-sm font-bold text-white" dir="ltr">
            Sam Rivera
          </p>
          <p className="text-[10px] text-emerald-300/80">متصل الآن — يتحدث الإنجليزية فقط</p>
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto py-4 pe-1">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%]", m.me ? "text-left" : "text-right")}>
              <div
                dir={m.me ? "ltr" : "ltr"}
                className={cn(
                  "font-en inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
                  m.me
                    ? "rounded-bl-md bg-gradient-to-br from-cyan-500/90 to-indigo-600/90 text-white shadow-[0_8px_24px_-10px_rgba(34,211,238,.5)]"
                    : "rounded-br-md border border-white/10 bg-white/[.06] text-white/85"
                )}
              >
                {m.text}
              </div>
              {m.orig && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-white/35">
                  <Zap className="h-2.5 w-2.5 text-cyan-300/60" />
                  مُترجمة — الأصل: «{m.orig.length > 42 ? `${m.orig.slice(0, 42)}…` : m.orig}»
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* composer */}
      <div className="relative border-t border-white/10 pt-4">
        {ar && (loading || out.trim()) && (
          <div className="pointer-events-none absolute inset-x-10 -top-1 z-20 flex -translate-y-full justify-center">
            <div className="animate-pop flex max-w-full items-center gap-2 rounded-xl border border-cyan-300/25 bg-[#0b1322]/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-cyan-300" />
              )}
              <span dir={dirOf(target)} className="font-en max-w-52 truncate text-[13px] text-cyan-100/90">
                {loading ? "…" : out}
              </span>
            </div>
          </div>
        )}

        <div className="relative">
          <input
            value={msg}
            onChange={(e) => repl.handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                if (repl.canReplace) repl.replaceNow();
              } else if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder="اكتب ردّك بالعربية — سيصله بالإنجليزية…"
            aria-label="حقل المحادثة"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.05] pe-4 ps-14 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/40 focus:bg-white/[.08]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!msg.trim()}
            aria-label="إرسال"
            className="absolute start-2 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-[#07080d] transition hover:brightness-110 disabled:opacity-30"
          >
            <Send className="h-4 w-4 -scale-x-100" />
          </button>
          {repl.flash > 0 && (
            <span key={repl.flash} className="animate-fieldflash pointer-events-none absolute inset-0" />
          )}
          {repl.original && !ar && (
            <button
              type="button"
              onClick={repl.restore}
              title={repl.original}
              className="absolute -top-9 end-1 z-10 flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-semibold text-white/55 backdrop-blur transition hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              استرجاع
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
