import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_LEN = 2000;
const CACHE_TTL = 10 * 60_000;

interface EngineResult {
  translated: string;
  detected: string;
}

const cache = new Map<string, { translated: string; detected: string; at: number }>();

function readCache(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit;
  cache.delete(key);
  return null;
}

function writeCache(key: string, value: EngineResult) {
  if (cache.size > 400) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { ...value, at: Date.now() });
}

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Offline phrasebook — last resort when both engines are unreachable. */
const PHRASES: Record<string, string> = {
  "مرحبا": "Hello",
  "مرحباً": "Hello",
  "مرحبا بك": "Welcome",
  "أهلا وسهلا": "Welcome",
  "صباح الخير": "Good morning",
  "مساء الخير": "Good evening",
  "شكرا": "Thank you",
  "شكراً": "Thank you",
  "شكرا جزيلا": "Thank you very much",
  "كيف حالك": "How are you?",
  "أهلا": "Hi",
  "مع السلامة": "Goodbye",
  "إلى اللقاء": "See you later",
  "حسنا": "Okay",
  "نعم": "Yes",
  "لا": "No",
  "من فضلك": "Please",
  "عفوا": "You're welcome",
  "ما اسمك": "What is your name?",
  "أنا بخير": "I am fine",
  "أحبك": "I love you",
  "تصبح على خير": "Good night",
};

function withTimeout<T>(promise: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function viaGoogle(q: string, from: string, to: string): Promise<EngineResult> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1" +
    `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(q)}`;
  const ac = new AbortController();
  const res = await withTimeout(
    fetch(url, {
      cache: "no-store",
      signal: ac.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; InstantTranslator/1.0)" },
    }),
    9000,
    ac.signal
  );
  if (!res.ok) throw new Error(`google:${res.status}`);
  const data = (await res.json()) as
    | { sentences?: Array<{ trans?: string }>; src?: string }
    | unknown[];
  if (Array.isArray(data)) {
    const segments = (data[0] as Array<[string | null, ...unknown[]]>) ?? [];
    const translated = segments.map((s) => (s && s[0]) || "").join("");
    const detected = typeof data[2] === "string" ? (data[2] as string) : from;
    if (!translated.trim()) throw new Error("google:empty");
    return { translated, detected };
  }
  const translated = (data.sentences ?? []).map((s) => s.trans ?? "").join("");
  if (!translated.trim()) throw new Error("google:empty");
  return { translated, detected: data.src ?? from };
}

async function viaMyMemory(q: string, from: string, to: string): Promise<EngineResult> {
  const src = from === "auto" ? (ARABIC_RE.test(q) ? "ar" : "en") : from;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    q.slice(0, 480)
  )}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(to)}`;
  const ac = new AbortController();
  const res = await withTimeout(fetch(url, { cache: "no-store", signal: ac.signal }), 9000, ac.signal);
  if (!res.ok) throw new Error(`mymemory:${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const translated = data?.responseData?.translatedText ?? "";
  if (!translated.trim()) throw new Error("mymemory:empty");
  return { translated, detected: src };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, MAX_LEN);
  const from = sp.get("from") ?? "auto";
  const to = sp.get("to") ?? "en";

  if (!q.trim()) {
    return NextResponse.json({ translated: "", detected: from });
  }
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(to) || (from !== "auto" && !/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(from))) {
    return NextResponse.json({ error: "لغة غير صالحة" }, { status: 400 });
  }

  const key = `${from}|${to}|${q}`;
  const hit = readCache(key);
  if (hit) {
    return NextResponse.json({ translated: hit.translated, detected: hit.detected, cached: true });
  }

  const errors: string[] = [];
  for (const engine of [viaGoogle, viaMyMemory]) {
    try {
      const result = await engine(q, from, to);
      writeCache(key, result);
      return NextResponse.json(result);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const trimmed = q.trim();
  if (trimmed.length < 64 && PHRASES[trimmed]) {
    return NextResponse.json({
      translated: PHRASES[trimmed],
      detected: ARABIC_RE.test(trimmed) ? "ar" : from,
      offline: true,
    });
  }

  return NextResponse.json(
    { error: "تعذّر الاتصال بمحركات الترجمة — تحقق من الاتصال بالشبكة", detail: errors.join(" | ") },
    { status: 502 }
  );
}
