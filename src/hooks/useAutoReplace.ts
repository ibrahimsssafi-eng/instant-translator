"use client";

import { useEffect, useRef, useState } from "react";
import { hasArabic } from "@/lib/langs";
import { blip } from "@/lib/client";

export interface ReplaceEvent {
  from: string;
  to: string;
  mode: "auto" | "manual";
}

/**
 * Watches an input's value; when it contains Arabic and a translation is
 * ready, it replaces the field content with the translation after a short
 * dwell — mimicking a desktop translator writing into the active field.
 */
export function useAutoReplace(opts: {
  value: string;
  setValue: (v: string) => void;
  translated: string;
  loading: boolean;
  enabled: boolean;
  dwellMs?: number;
  onReplaced?: (e: ReplaceEvent) => void;
}) {
  const { value, setValue, translated, loading, enabled, onReplaced } = opts;
  const dwell = opts.dwellMs ?? 750;
  const [original, setOriginal] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const suppress = useRef("");
  const cbRef = useRef(onReplaced);
  cbRef.current = onReplaced;

  useEffect(() => {
    if (!enabled || loading || !translated.trim() || !hasArabic(value)) return;
    if (suppress.current && suppress.current === value) return;
    const from = value;
    const to = translated;
    const timer = setTimeout(() => {
      suppress.current = "";
      setOriginal(from);
      setFlash((f) => f + 1);
      blip();
      setValue(to);
      cbRef.current?.({ from, to, mode: "auto" });
    }, dwell);
    return () => clearTimeout(timer);
  }, [enabled, loading, translated, value, dwell, setValue]);

  const replaceNow = () => {
    if (!translated.trim() || !hasArabic(value)) return;
    suppress.current = "";
    setOriginal(value);
    setFlash((f) => f + 1);
    blip();
    setValue(translated);
    cbRef.current?.({ from: value, to: translated, mode: "manual" });
  };

  const restore = () => {
    if (!original) return;
    suppress.current = original;
    setValue(original);
    setOriginal(null);
  };

  const handleChange = (v: string) => {
    if (v !== suppress.current) suppress.current = "";
    setValue(v);
  };

  return {
    original,
    flash,
    replaceNow,
    restore,
    handleChange,
    canReplace: !!translated.trim() && hasArabic(value),
  };
}
