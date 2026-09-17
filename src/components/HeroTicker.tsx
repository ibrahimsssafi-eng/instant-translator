"use client";

import { useEffect, useState } from "react";
import { MoveLeft, Zap } from "lucide-react";

const PAIRS: Array<[string, string]> = [
  ["مرحبا بك في فريقنا", "Welcome to our team"],
  ["هل يمكن تأجيل الاجتماع؟", "Can we postpone the meeting?"],
  ["أرسل لي عرض السعر", "Send me the price quote"],
  ["شكرًا على سرعة الرد", "Thanks for the quick reply"],
  ["أخبار التقنية اليوم", "Today's tech news"],
];

export default function HeroTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PAIRS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const [source, target] = PAIRS[index];

  return (
    <div className="mx-auto mt-10 flex w-fit max-w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 backdrop-blur sm:gap-4 sm:px-6">
      <span
        key={`ar-${index}`}
        className="animate-fadeup truncate text-sm font-bold text-white sm:text-base"
      >
        {source}
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10">
        <MoveLeft className="h-3.5 w-3.5 text-cyan-300" />
      </span>
      <span
        key={`en-${index}`}
        dir="ltr"
        className="font-en animate-fadeup truncate text-sm font-bold text-cyan-200 sm:text-base"
      >
        {target}
      </span>
      <span className="hidden items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:flex">
        <Zap className="h-3 w-3" />
        فوري
      </span>
    </div>
  );
}
