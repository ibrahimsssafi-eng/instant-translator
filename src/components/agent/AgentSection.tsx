"use client";

import { useEffect, useState } from "react";
import {
  AppWindow,
  Check,
  Command,
  Copy,
  Cpu,
  Download,
  FileCode2,
  FileTerminal,
  FlaskConical,
  FolderArchive,
  Keyboard,
  MousePointerClick,
  MoveLeft,
  NotebookPen,
  ShieldCheck,
  Terminal,
  TextCursorInput,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/client";

type OS = "windows" | "macos" | "linux";

interface AgentInfo {
  id: string;
  platform: string;
  version: string;
  translated: number;
  chars: number;
  lastSeenAt: string;
}

const numFmt = new Intl.NumberFormat("ar-EG");

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `قبل ${numFmt.format(s)} ثانية`;
  const m = Math.round(s / 60);
  if (m < 60) return `قبل ${numFmt.format(m)} دقيقة`;
  return `قبل ${numFmt.format(Math.round(m / 60))} ساعة`;
}

const FILES: Array<{ href: string; label: string; sub: string; icon: LucideIcon; primary?: boolean }> = [
  {
    href: "/downloads/instant-translator-source.zip",
    label: "instant-translator-source.zip",
    sub: "📦 كود المشروع بالكامل (الموقع + الوكيل) لرفعه على GitHub ونشره",
    icon: FolderArchive,
    primary: true,
  },
  {
    href: "/agent/translator_app.py",
    label: "translator_app.py",
    sub: "تطبيق سطح المكتب — نافذة رسومية سهلة لجميع الفئات",
    icon: AppWindow,
  },
  {
    href: "/agent/translator_agent.py",
    label: "translator_agent.py",
    sub: "نسخة الطرفية — تشغيل خلفي للمحترفين",
    icon: FileCode2,
  },
  {
    href: "/agent/agent_selftest.py",
    label: "agent_selftest.py",
    sub: "فحص ذاتي — إثبات الآلية على جهازك في ٦٠ ثانية",
    icon: FlaskConical,
  },
  {
    href: "/agent/install-windows.bat",
    label: "install-windows.bat",
    sub: "تثبيت ويندوز بنقرة — تطبيق رسومي + بدء تلقائي",
    icon: FileTerminal,
  },
  {
    href: "/agent/build-windows-exe.bat",
    label: "build-windows-exe.bat",
    sub: "يبني InstantTranslator.exe مستقلًا — للمشاركة بدون بايثون",
    icon: Terminal,
  },
  {
    href: "/agent/agent-mac-linux.sh",
    label: "agent-mac-linux.sh",
    sub: "تثبيت ماك / لينكس",
    icon: Terminal,
  },
];

const INSTALL: Record<
  OS,
  { name: string; icon: LucideIcon; steps: string[]; note: string }
> = {
  windows: {
    name: "ويندوز",
    icon: AppWindow,
    steps: [
      "حمّل translator_app.py و install-windows.bat وضع الملفين في مجلد واحد",
      "شغّل install-windows.bat — يثبّت المتطلبات، يفتح نافذة المترجم الرسومية، ويضيفها لبدء التشغيل التلقائي مع ويندوز",
      "من النافذة: زر التشغيل الكبير، اختر اللغة من القائمة، وحرّك شريط «مدة الصمت» من ثانية حتى ٥ دقائق — ثم اكتب بالعربية في أي تطبيق وستُستبدل في مكانها",
      "اختياري: شغّل build-windows-exe.bat لإنتاج InstantTranslator.exe مستقل تمامًا — شاركه مع أي شخص ويعمل بدون بايثون",
    ],
    note: "يتطلب Python من python.org — فعّل «Add python.exe to PATH» أثناء التثبيت. ملف EXE الناتج لا يحتاج بايثون إطلاقًا.",
  },
  macos: {
    name: "ماك",
    icon: Command,
    steps: [
      "حمّل translator_agent.py و agent-mac-linux.sh وضعهما في مجلد واحد",
      "من الطرفية: chmod +x agent-mac-linux.sh ثم ./agent-mac-linux.sh — يعمل الوكيل خلفيًا ويكتب سجلّه في translator_agent.log",
      "امنح الطرفية صلاحيتي «إمكانية الوصول Accessibility» و«مراقبة الإدخال Input Monitoring» من إعدادات الخصوصية ثم أعد تشغيل السكربت",
    ],
    note: "بدون صلاحية الوصول لا يستطيع النظام السماح بالتقاط لوحة المفاتيح عالميًا — وهذا متعمَّد من Apple.",
  },
  linux: {
    name: "لينكس",
    icon: Terminal,
    steps: [
      "حمّل translator_agent.py و agent-mac-linux.sh وضعهما في مجلد واحد",
      "من الطرفية: chmod +x agent-mac-linux.sh ثم ./agent-mac-linux.sh",
      "سجّل الدخول بجلسة «on Xorg» — التقاط لوحة المفاتيح العالمي يتطلب X11 ولا يعمل على Wayland",
    ],
    note: "لإيقاف الوكيل: kill $(cat translator_agent.pid) — وإن ظهر خطأ tkinter مع التطبيق الرسومي نفّذ: sudo apt install python3-tk",
  },
};

const HOTKEYS: Array<{ k: string; label: string }> = [
  { k: "F8", label: "إيقاف / استئناف" },
  { k: "F9", label: "ترجمة الجملة فورًا" },
  { k: "F6 / F7", label: "مدة الصمت أقل / أكثر" },
  { k: "1s – 5min", label: "مدى مدة الاستبدال" },
  { k: "Enter", label: "بداية جملة جديدة" },
];

export default function AgentSection() {
  const [os, setOs] = useState<OS>("windows");

  return (
    <section id="agent" className="scroll-mt-28">
      <div className="mb-8">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-300">
          <Cpu className="h-4 w-4" />
          وكيل سطح المكتب — الترجمة الفعلية على جهازك
        </p>
        <h2 className="text-3xl font-extrabold leading-snug sm:text-4xl">
          يعمل في الخلفية،{" "}
          <span className="gradient-text">يترجم على مستوى النظام كله</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50 sm:text-base">
          شغّل الوكيل لمرة واحدة فقط فيتزامن مع لوحة مفاتيحك: اكتب بالعربية في أي متصفح أو بريد أو
          برنامج محادثة أو مربع بحث، توقّف لحظة واحدة، وسيُستبدل النص بالترجمة داخل مربع الإدخال
          نفسه — دون نسخ، دون لصق، ودون فتح أي نافذة.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Status + how it works ── */}
        <div className="space-y-4">
          <StatusCard />

          <div className="rounded-[26px] border border-white/10 bg-white/[.03] p-5 backdrop-blur-xl sm:p-6">
            <h3 className="text-sm font-extrabold text-white/80">كيف يعمل أثناء كتابتك</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              <FlowStep
                icon={Keyboard}
                title="اكتب بالعربية"
                sub="أي حقل في أي تطبيق أو متصفح"
              />
              <MoveLeft className="hidden h-4 w-4 text-white/25 sm:block" />
              <FlowStep
                icon={Zap}
                title="الوكيل يلتقط ويترجم"
                sub="أقل من نصف ثانية"
                accent
              />
              <MoveLeft className="hidden h-4 w-4 text-white/25 sm:block" />
              <FlowStep
                icon={TextCursorInput}
                title="يُستبدل بمكانه"
                sub="ذات مربع الإدخال الذي تكتب فيه"
              />
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-400/[.06] p-3.5 text-[11px] leading-relaxed text-emerald-200/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              الوكيل لا يرسل شيئًا لأي خادم سوى الجملة العربية نفسها لمحرك الترجمة لحظة الاستبدال —
              ولا يُسجَّل أي شيء آخر من كتابتك، ويُمسح المخزن المؤقت عند كل نقرة فأرة أو Enter.
            </div>
          </div>
        </div>

        {/* ── Install ── */}
        <div className="rounded-[26px] border border-white/10 bg-white/[.03] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-1.5">
            {(Object.keys(INSTALL) as OS[]).map((key) => {
              const item = INSTALL[key];
              const Icon = item.icon;
              const active = os === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOs(key)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                    active
                      ? "bg-gradient-to-l from-cyan-400/25 to-fuchsia-500/25 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
                      : "text-white/45 hover:text-white/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
          </div>

          <ol className="mt-5 space-y-3.5">
            {INSTALL[os].steps.map((step, i) => (
              <li key={`${os}-${i}`} className="animate-fadeup flex items-start gap-3" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-[11px] font-black text-cyan-200">
                  {i + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-white/65">{step}</p>
              </li>
            ))}
          </ol>

          <p className="mt-4 rounded-xl border border-white/[.07] bg-white/[.03] p-3 text-[11px] leading-relaxed text-white/40">
            {INSTALL[os].note}
          </p>

          {/* downloads */}
          <div className="mt-5 space-y-2">
            {FILES.map((f) => {
              const Icon = f.icon;
              return (
                <a
                  key={f.href}
                  href={f.href}
                  download
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border p-3 transition",
                    f.primary
                      ? "border-cyan-300/25 bg-gradient-to-l from-cyan-400/15 to-indigo-500/15 hover:from-cyan-400/25 hover:to-indigo-500/25"
                      : "border-white/10 bg-white/[.04] hover:border-white/20 hover:bg-white/[.07]"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      f.primary ? "bg-cyan-300/20 text-cyan-200" : "bg-white/[.06] text-white/60"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-en block truncate text-sm font-bold text-white/90" dir="ltr">
                      {f.label}
                    </span>
                    <span className="block text-[11px] text-white/40">{f.sub}</span>
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/50 transition group-hover:border-cyan-300/40 group-hover:text-cyan-200">
                    <Download className="h-3.5 w-3.5" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* 60-second proof on a real desktop */}
      <div className="mt-4 overflow-hidden rounded-[26px] border border-cyan-300/15 bg-gradient-to-l from-cyan-400/[.08] via-transparent to-transparent backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
          <div className="min-w-64 flex-1">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-white/90">
              <FlaskConical className="h-[18px] w-[18px] text-cyan-300" />
              تحقق منه على سطح مكتبك في ٦٠ ثانية
            </h3>
            <ol className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-white/55">
              <li className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
                حمّل <span className="font-en font-semibold text-white/70" dir="ltr">agent_selftest.py</span> ثم نفّذه:
                <span className="font-en rounded bg-black/40 px-1.5 py-0.5 text-xs text-cyan-200" dir="ltr">python agent_selftest.py</span>
              </li>
              <li className="flex items-center gap-2">
                <NotebookPen className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
                عندما يطلب منك: افتح «المفكرة» (أو أي حقل في أي تطبيق) وانقر بداخله ثم اضغط Enter
              </li>
              <li className="flex items-center gap-2">
                <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
                ستشاهد جملة عربية تُلصق، تُمحى بالـ Backspace، وتحلّ ترجمتها مكانها — <span className="font-bold text-emerald-300">نفس آلية الوكيل حرفيًا</span>
              </li>
            </ol>
          </div>
          <a
            href="/agent/agent_selftest.py"
            download
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-400 to-indigo-500 px-6 py-3.5 text-sm font-black text-[#07080d] shadow-[0_10px_30px_-10px_rgba(34,211,238,.5)] transition hover:brightness-110"
          >
            <FlaskConical className="h-4 w-4" />
            تحميل الفحص الذاتي
          </a>
        </div>
        <div className="border-t border-white/[.06] px-5 py-3 text-[11px] leading-relaxed text-white/35 sm:px-6">
          إن نجح الفحص فالوكيل سيعمل معك بنفس الطريقة 100٪ — والفرق الوحيد أن الوكيل يلتقط ما تكتبه أنت فعليًا بدل الجملة الاختبارية. ملاحظة: هذه الصفحة نفسها تعمل على خادم بلا سطح مكتب، ولهذا وُضع الفحص ليُثبت الآلية على جهازك أنت.
        </div>
      </div>

      {/* hotkeys + config */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[26px] border border-white/10 bg-white/[.03] p-5 backdrop-blur-xl sm:p-6">
          <h3 className="text-sm font-extrabold text-white/80">مفاتيح التحكم أثناء العمل</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {HOTKEYS.map((h) => (
              <span
                key={h.k}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-[11px] font-semibold text-white/55"
              >
                <kbd className="font-en rounded-md border border-white/15 bg-white/[.08] px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                  {h.k}
                </kbd>
                {h.label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-white/35">
            تذكير: امنح نفسك لحظة صمت قصيرة بعد الجملة العربية قبل الضغط على Enter لتُستبدل — أو
            اضغط F9 لترجمتها فورًا قبل الإرسال.
          </p>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[.03] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-white/80">الإعدادات — أعلى ملف الوكيل</h3>
            <CopyButton
              text={'TARGET_LANG  = "en"\nIDLE_SECONDS = 0.9\nCONSOLE_URL  = ""'}
            />
          </div>
          <pre
            dir="ltr"
            className="font-en mt-4 overflow-x-auto rounded-2xl border border-white/[.07] bg-black/40 p-4 text-left text-[13px] leading-relaxed text-cyan-100/80"
          >
{`TARGET_LANG  = "en"   # target language
IDLE_SECONDS = 0.9    # silence before replace
CONSOLE_URL  = ""     # this console's URL (optional sync)`}
          </pre>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            اضبط CONSOLE_URL على عنوان هذه الصفحة ليتصل وكيلك بها وتظهر حالته وإحصاءاته مباشرةً في
            بطاقة الحالة أعلاه.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlowStep({
  icon: Icon,
  title,
  sub,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center",
        accent
          ? "border-cyan-300/25 bg-gradient-to-b from-cyan-400/15 to-transparent"
          : "border-white/[.07] bg-white/[.03]"
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border",
          accent
            ? "border-cyan-300/40 bg-cyan-300/20 text-cyan-200"
            : "border-white/10 bg-white/5 text-white/60"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-xs font-extrabold text-white/80">{title}</span>
      <span className="text-[10px] leading-relaxed text-white/35">{sub}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* blocked */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1300);
      }}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] font-bold text-white/60 transition hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "تم النسخ" : "نسخ"}
    </button>
  );
}

function StatusCard() {
  const [status, setStatus] = useState<{ online: boolean; agent: AgentInfo | null } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/agent", { cache: "no-store" });
        const json = (await res.json()) as { online: boolean; agent: AgentInfo | null };
        if (alive) setStatus(json);
      } catch {
        /* keep previous */
      }
    };
    void load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const online = !!status?.online;
  const agent = status?.agent ?? null;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[.03] p-5 backdrop-blur-xl sm:p-6">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent to-transparent",
          online ? "via-emerald-300/60" : "via-white/20"
        )}
      />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl border",
            online
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[.05] text-white/35"
          )}
        >
          {online ? <Zap className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-2 text-sm font-extrabold text-white/85">
            حالة الوكيل على جهازك
            <span
              className={cn(
                "size-1.5 rounded-full",
                online ? "animate-pulse bg-emerald-400" : "bg-white/25"
              )}
            />
          </p>
          <p className="mt-0.5 truncate text-[11px] text-white/40">
            {online && agent
              ? `${agent.platform || "جهاز"} · إصدار ${agent.version || "1.0.0"} · آخر إشارة ${ago(
                  agent.lastSeenAt
                )}`
              : "جارٍ الانتظار لأول إشارة من وكيل سطح المكتب…"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black",
            online
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[.04] text-white/40"
          )}
        >
          {online ? "متصل الآن" : "غير متصل"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
          <p className="text-2xl font-black text-white/90">
            {agent ? numFmt.format(agent.translated) : "٠"}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white/40">ترجمة أُنجزت من جهازك</p>
        </div>
        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
          <p className="text-2xl font-black text-white/90">
            {agent ? numFmt.format(agent.chars) : "٠"}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white/40">حرفًا عربيًا استُبدل</p>
        </div>
      </div>

      {!online && (
        <p className="mt-4 text-[11px] leading-relaxed text-white/35">
          بعد تشغيل الوكيل وضبط <span className="font-en" dir="ltr">CONSOLE_URL</span> على عنوان هذه
          الصفحة، ستتحول البطاقة إلى «متصل» تلقائيًا وستظهر إحصاءات جهازك هنا لحظة بلحظة.
        </p>
      )}
    </div>
  );
}
