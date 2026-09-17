"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Eraser,
  Keyboard,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Volume2,
  Zap,
} from "lucide-react";
import LangSelect from "./LangSelect";
import Switch from "./Switch";
import { SOURCE_OPTIONS, TARGET_OPTIONS, dirOf, hasArabic, nativeName } from "@/lib/langs";
import { cn, saveHistory, speakText } from "@/lib/client";
import { useInstant } from "@/hooks/useInstant";
import { useAutoReplace } from "@/hooks/useAutoReplace";

const MAX = 2000;

const EXAMPLES = [
  "صباح الخير، هل يمكننا تأجيل الاجتماع إلى الغد؟",
  "أود حجز طاولة لشخصين مساء يوم الجمعة",
  "الشحنة ستصل إلى المستودع نهاية هذا الأسبوع",
  "أرسل لي التقرير المالي فور جهوزه من فضلك",
  "ما هي أفضل طريقة للوصول إلى المطار؟",
];

export default function Workspace({
  auto,
  onAutoChange,
  target,
  onTargetChange,
}: {
  auto: boolean;
  onAutoChange: (v: boolean) => void;
  target: string;
  onTargetChange: (v: string) => void;
}) {
  const [source, setSource] = useState("ar");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exIdx, setExIdx] = useState(0);
  const copyTimer = useRef<number | undefined>(undefined);

  const arDetected = hasArabic(text);
  const outputDir = dirOf(target);

  const {
    text: out,
    detected,
    loading,
    latency,
    error,
  } = useInstant(text, source, target, { delay: 420, nonce: retry });

  const repl = useAutoReplace({
    value: text,
    setValue: setText,
    translated: out,
    loading,
    enabled: auto && !error && arDetected,
    dwellMs: 800,
    onReplaced: (e) => {
      void saveHistory({ source: e.from, translated: e.to, from: "ar", to: target, mode: e.mode });
    },
  });

  useEffect(() => {
    const id = setInterval(() => setExIdx((i) => (i + 1) % EXAMPLES.length), 3400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const swap = () => {
    if (source === target) return;
    const prev = source;
    setSource(target);
    onTargetChange(prev);
  };

  const clear = () => {
    repl.handleChange("");
    setCopied(false);
  };

  const copyOut = async () => {
    const val = out || text;
    if (!val.trim()) return;
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      /* clipboard blocked */
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    if (hasArabic(text) && out.trim()) {
      void saveHistory({ source: text, translated: out, from: "ar", to: target, mode: "copy" });
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (repl.canReplace) repl.replaceNow();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void copyOut();
    } else if (e.key === "Escape") {
      clear();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_40px_120px_-40px_rgba(34,211,238,.18)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-cyan-300/60 to-transparent" />

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/40">من</span>
          <div className="w-32 sm:w-36">
            <LangSelect
              ariaLabel="لغة المصدر"
              value={source}
              onChange={setSource}
              options={SOURCE_OPTIONS}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={swap}
          disabled={source === target}
          title="تبديل الاتجاه"
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-500 hover:rotate-180 hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:rotate-0"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/40">إلى</span>
          <div className="w-32 sm:w-36">
            <LangSelect
              ariaLabel="اللغة الهدف"
              value={target}
              onChange={onTargetChange}
              options={TARGET_OPTIONS}
            />
          </div>
        </div>

        <div className="ms-auto flex items-center gap-4">
          {latency != null && !error && (
            <span className="hidden items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200 sm:flex">
              <Zap className="h-3.5 w-3.5" />
              <span dir="ltr" className="font-en">
                {latency}ms
              </span>
            </span>
          )}
          <Switch on={auto} onChange={onAutoChange} label="استبدال تلقائي" />
        </div>
      </div>

      {/* ── Panes ───────────────────────────────────── */}
      <div className="grid md:grid-cols-2">
        {/* Source */}
        <div className="relative flex min-h-[300px] flex-col">
          <div className="flex items-center gap-2 px-5 pt-4 sm:px-7">
            <span className="text-xs font-bold text-white/50">النص الأصلي</span>
            {text.trim() && (
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/50">
                <ScanLine className="h-3 w-3" />
                اكتُشف: {nativeName(detected || "ar")}
              </span>
            )}
            <div className="ms-auto flex items-center gap-1">
              <IconBtn title="نطق النص" disabled={!text.trim()} onClick={() => speakText(text, source)}>
                <Volume2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="مسح" disabled={!text} onClick={clear}>
                <Eraser className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          <textarea
            value={text}
            maxLength={MAX}
            onChange={(e) => {
              repl.handleChange(e.target.value);
              setCopied(false);
            }}
            onKeyDown={onKeyDown}
            placeholder={EXAMPLES[exIdx]}
            aria-label="النص المراد ترجمته"
            className="min-h-[170px] flex-1 resize-none bg-transparent px-5 py-4 text-xl font-medium leading-loose text-white focus:outline-none sm:px-7"
          />

          {repl.flash > 0 && (
            <span key={repl.flash} className="animate-fieldflash pointer-events-none absolute inset-0" />
          )}

          {repl.original && !arDetected && (
            <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 sm:mx-7">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>تم استبدال النص بالترجمة</span>
              <span className="hidden max-w-44 truncate text-white/40 sm:inline" title={repl.original}>
                «{repl.original}»
              </span>
              <button
                type="button"
                onClick={repl.restore}
                className="ms-auto flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 font-semibold transition hover:bg-emerald-300/20"
              >
                <RotateCcw className="h-3 w-3" />
                تراجع
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-5 pb-4 text-[11px] text-white/35 sm:px-7">
            <span className="font-en">
              {text.length} / {MAX}
            </span>
            {arDetected && out.trim() && !loading && (
              <button
                type="button"
                onClick={() => repl.replaceNow()}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-200 transition hover:bg-cyan-300/20"
              >
                <Zap className="h-3 w-3" />
                استبدال الآن
                <kbd className="font-en rounded border border-white/15 bg-white/10 px-1 text-[9px]">Tab</kbd>
              </button>
            )}
          </div>
        </div>

        {/* Target */}
        <div className="relative flex min-h-[300px] flex-col border-t border-white/10 bg-white/[0.02] md:border-s md:border-t-0">
          <div className="flex items-center gap-2 px-5 pt-4 sm:px-7">
            <span className="text-xs font-bold text-white/50">الترجمة</span>
            <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-200">
              {nativeName(target)}
            </span>
            {loading && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-200/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                يترجم الآن…
              </span>
            )}
            <div className="ms-auto flex items-center gap-1">
              <IconBtn title={copied ? "تم النسخ" : "نسخ الترجمة"} disabled={!out.trim() && !text.trim()} onClick={() => void copyOut()}>
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              </IconBtn>
              <IconBtn title="نطق الترجمة" disabled={!out.trim()} onClick={() => speakText(out, target)}>
                <Volume2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-5 py-4 sm:px-7" aria-live="polite">
            {error ? (
              <div className="m-auto flex flex-col items-center gap-3 text-center">
                <p className="max-w-60 text-sm leading-relaxed text-rose-300/80">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetry((r) => r + 1)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  إعادة المحاولة
                </button>
              </div>
            ) : loading && !out ? (
              <div className="space-y-3.5 pt-2" dir={outputDir}>
                {[92, 74, 58].map((w) => (
                  <div
                    key={w}
                    className="h-4 animate-pulse rounded-full bg-white/[.07]"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : out.trim() ? (
              <>
                <p
                  key={out}
                  dir={outputDir}
                  className={cn(
                    "animate-fadeup whitespace-pre-wrap text-xl leading-loose text-white",
                    outputDir === "ltr" && "font-en text-left"
                  )}
                >
                  {out}
                </p>
                {loading && <span className="mt-3 text-[11px] text-cyan-200/50">يُحدَّث…</span>}
              </>
            ) : (
              <div className="m-auto flex flex-col items-center gap-3 text-center">
                <span className="grid size-12 place-items-center rounded-2xl border border-dashed border-white/15 text-white/30">
                  <Keyboard className="h-5 w-5" />
                </span>
                <p className="max-w-60 text-xs leading-relaxed text-white/35">
                  ابدأ الكتابة بالعربية وستظهر الترجمة هنا فور توقّفك للحظة
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 pb-4 text-[11px] text-white/35 sm:px-7">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", error ? "bg-rose-400" : "bg-emerald-400 animate-pulse")} />
              {error ? "انقطع الاتصال بالمحرك" : "محرك الترجمة متصل"}
            </span>
            {latency != null && !loading && !error && (
              <span dir="ltr" className="font-en">
                {latency}ms
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Shortcuts ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-5 py-3.5 text-[11px] text-white/40 sm:px-7">
        <Hint k="Tab" label="استبدال فوري" />
        <Hint k="Ctrl + ↵" label="نسخ الترجمة" />
        <Hint k="Esc" label="مسح الحقل" />
        <span className="ms-auto hidden lg:block">
          يُستبدل النص داخل الحقل تلقائيًا بعد توقّف قصير عن الكتابة
        </span>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="font-en rounded-md border border-white/15 bg-white/[.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
        {k}
      </kbd>
      {label}
    </span>
  );
}
