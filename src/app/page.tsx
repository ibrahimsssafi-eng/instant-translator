import {
  Keyboard,
  Languages,
  MousePointerClick,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/Header";
import CursorGlow from "@/components/CursorGlow";
import Reveal from "@/components/Reveal";
import HeroTicker from "@/components/HeroTicker";
import AgentSection from "@/components/agent/AgentSection";
import TranslatorApp from "@/components/translator/TranslatorApp";
import HistoryPanel from "@/components/translator/HistoryPanel";

export default function Home() {
  return (
    <div id="top" className="relative min-h-screen overflow-x-clip bg-[#07080d] text-white">
      {/* ── Background art ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="animate-blob absolute -top-44 start-[8%] size-[34rem] rounded-full bg-cyan-500/[.12] blur-[120px]" />
        <div
          className="animate-blob absolute -end-44 top-[32%] size-[30rem] rounded-full bg-fuchsia-500/[.1] blur-[120px]"
          style={{ animationDelay: "-9s" }}
        />
        <div
          className="animate-blob absolute bottom-[-12%] start-[32%] size-[28rem] rounded-full bg-indigo-500/[.1] blur-[120px]"
          style={{ animationDelay: "-17s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,black,transparent)]" />
        <div className="noise absolute inset-0 opacity-[.05]" />
      </div>

      <CursorGlow />
      <Header />

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-36 text-center sm:pt-40">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-4 py-1.5 text-xs font-bold text-cyan-200">
              <Zap className="h-3.5 w-3.5" />
              مترجم فوري من العربية — يكتب بدلًا عنك
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 text-4xl font-black leading-[1.3] sm:text-6xl sm:leading-[1.25]">
              اكتب بالعربية…
              <br />
              <span className="gradient-text">وسيظهر بالإنجليزية حيث تكتب</span>
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-loose text-white/55 sm:text-lg">
              حمّل وكيل سطح المكتب ليعمل في الخلفية متزامنًا مع لوحة مفاتيحك: تكتب بالعربية في أي
              متصفح أو بريد أو برنامج، تتوقف لحظة، فيُستبدل نصّك بالترجمة داخل مربع الإدخال نفسه —
              أينما كان. وبالأسفل جرّب نفس المحرك مباشرةً في المتصفح.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <HeroTicker />
          </Reveal>

          <Reveal delay={340}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-semibold text-white/40">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-cyan-300/70" />
                أقل من نصف ثانية
              </span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-fuchsia-300/70" />
                ١٥ لغة عالمية
              </span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span className="flex items-center gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5 text-emerald-300/70" />
                استبدال داخل الحقول نفسها
              </span>
            </div>
          </Reveal>
        </section>

        {/* ── Desktop agent (the real background translator) ── */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <AgentSection />
          </Reveal>
        </section>

        {/* ── Workspace + Desktop playground (browser demo) ── */}
        <section id="workspace" className="mx-auto max-w-6xl scroll-mt-28 px-6">
          <Reveal>
            <TranslatorApp />
          </Reveal>
        </section>

        {/* ── Features ── */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={Zap}
              title="ترجمة لحظية حقيقية"
              desc="محرك مزدوج مع تخزين مؤقت ذكي على الخادم والمتصفح، يعيد النتيجة خلال أجزاء من الثانية."
            />
            <Feature
              icon={Keyboard}
              title="اختصارات المحترفين"
              desc="Tab للاستبدال الفوري، Ctrl+Enter للنسخ، و Esc لمسح الحقل — سير عمل كامل دون لمس الفأرة."
            />
            <Feature
              icon={ShieldCheck}
              title="تحكّم كامل بسجلّك"
              desc="تُحفظ ترجماتك في قاعدة بياناتك الخاصة مع عدّادات استخدام، وزر واحد يمحوها متى شئت."
            />
          </div>
        </section>

        {/* ── History ── */}
        <section id="history" className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-28">
          <Reveal>
            <HistoryPanel />
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-9 text-center text-xs leading-relaxed text-white/35">
        <p>المترجم الفوري © 2026 — ترجمة حيّة من العربية إلى العالم</p>
        <p className="mt-1.5">
          تنبيه: لا تفعّل الاستبدال التلقائي داخل حقول كلمات المرور أو البيانات الحسّاسة.
        </p>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-white/[.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[.05] hover:shadow-[0_20px_60px_-20px_rgba(34,211,238,.25)]">
      <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/15 to-fuchsia-500/15 transition-all duration-300 group-hover:from-cyan-400/30 group-hover:to-fuchsia-500/30">
        <Icon className="h-5 w-5 text-cyan-300" />
      </span>
      <h3 className="mt-4 text-base font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/45">{desc}</p>
    </div>
  );
}
