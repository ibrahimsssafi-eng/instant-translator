"use client";

import { useEffect, useRef, useState } from "react";

export interface InstantState {
  text: string;
  detected: string;
  loading: boolean;
  latency: number | null;
  error: string | null;
}

interface CacheEntry {
  text: string;
  detected: string;
  at: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60_000;

function readCache(key: string): CacheEntry | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit;
  cache.delete(key);
  return null;
}

function writeCache(key: string, value: Omit<CacheEntry, "at">) {
  if (cache.size > 250) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { ...value, at: Date.now() });
}

/**
 * Debounced instant translation. Returns the translated text for `raw`
 * shortly after the user stops typing, with request + client caching.
 */
export function useInstant(
  raw: string,
  from: string,
  to: string,
  opts: { delay?: number; enabled?: boolean; nonce?: number } = {}
): InstantState {
  const { delay = 450, enabled = true, nonce = 0 } = opts;
  const [state, setState] = useState<InstantState>({
    text: "",
    detected: "",
    loading: false,
    latency: null,
    error: null,
  });
  const seqRef = useRef(0);

  useEffect(() => {
    const q = raw;
    if (!enabled || !q.trim()) {
      setState((s) => ({ ...s, text: "", detected: "", loading: false, error: null }));
      return;
    }

    const key = `${from}|${to}|${q}`;
    const hit = readCache(key);
    const seq = ++seqRef.current;
    if (hit) {
      setState({ text: hit.text, detected: hit.detected, loading: false, latency: 0, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    const ac = new AbortController();
    const started = performance.now();
    const timer = setTimeout(async () => {
      try {
        const url = `/api/translate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
          to
        )}&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal: ac.signal });
        const json = (await res.json()) as { translated?: string; detected?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "تعذّرت الترجمة حاليًا");
        if (seqRef.current !== seq) return;
        const value = { text: String(json.translated ?? ""), detected: String(json.detected ?? from) };
        writeCache(key, value);
        setState({
          text: value.text,
          detected: value.detected,
          loading: false,
          latency: Math.max(1, Math.round(performance.now() - started)),
          error: null,
        });
      } catch (err) {
        if (ac.signal.aborted || seqRef.current !== seq) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "خطأ غير متوقع",
        }));
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [raw, from, to, delay, enabled, nonce]);

  return state;
}
