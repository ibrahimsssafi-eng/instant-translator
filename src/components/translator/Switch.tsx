"use client";

import { cn } from "@/lib/client";

export default function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group flex cursor-pointer items-center gap-2.5"
    >
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300",
          on
            ? "border-cyan-300/40 bg-gradient-to-l from-cyan-400/90 to-fuchsia-500/90 shadow-[0_0_20px_rgba(34,211,238,.35)]"
            : "border-white/15 bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute start-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform duration-300",
            on ? "-translate-x-5" : "translate-x-0"
          )}
        />
      </span>
      {label ? (
        <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white">
          {label}
        </span>
      ) : null}
    </button>
  );
}
