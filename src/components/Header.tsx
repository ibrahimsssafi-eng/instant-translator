"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/client";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#07080d]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <a href="#top" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-[0_8px_24px_rgba(34,211,238,.35)]">
            <Languages className="h-[18px] w-[18px] text-[#07080d]" strokeWidth={2.5} />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold">المترجم الفوري</span>
            <span className="block text-[10px] font-medium text-white/45">
              ترجمة لحظية + استبدال داخلي
            </span>
          </span>
        </a>

        <nav className="ms-auto hidden items-center gap-7 text-[13px] font-medium text-white/60 md:flex">
          <a href="#agent" className="transition hover:text-white">
            وكيل سطح المكتب
          </a>
          <a href="#workspace" className="transition hover:text-white">
            المحرر
          </a>
          <a href="#playground" className="transition hover:text-white">
            بيئة سطح المكتب
          </a>
          <a href="#history" className="transition hover:text-white">
            السجل
          </a>
        </nav>

        <span className="ms-auto flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 md:ms-6">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          المحرك متصل
        </span>
      </div>
    </header>
  );
}
