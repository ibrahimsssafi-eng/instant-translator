"use client";

import { ChevronDown } from "lucide-react";
import type { Lang } from "@/lib/langs";

export default function LangSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Lang[];
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[.05] py-2 pe-9 ps-3.5 text-sm font-medium text-white/85 outline-none transition hover:border-white/20 focus:border-cyan-300/50 focus:bg-white/[.08]"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code} className="bg-[#0d1017] text-white">
            {l.native}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
    </div>
  );
}
