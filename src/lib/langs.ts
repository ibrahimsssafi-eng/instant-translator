export type LangDir = "rtl" | "ltr";

export interface Lang {
  code: string;
  native: string;
  dir: LangDir;
}

export const ARABIC: Lang = { code: "ar", native: "العربية", dir: "rtl" };

export const LANGUAGES: Lang[] = [
  { code: "en", native: "الإنجليزية", dir: "ltr" },
  { code: "fr", native: "الفرنسية", dir: "ltr" },
  { code: "es", native: "الإسبانية", dir: "ltr" },
  { code: "de", native: "الألمانية", dir: "ltr" },
  { code: "it", native: "الإيطالية", dir: "ltr" },
  { code: "pt", native: "البرتغالية", dir: "ltr" },
  { code: "tr", native: "التركية", dir: "ltr" },
  { code: "ru", native: "الروسية", dir: "ltr" },
  { code: "zh-CN", native: "الصينية", dir: "ltr" },
  { code: "ja", native: "اليابانية", dir: "ltr" },
  { code: "ko", native: "الكورية", dir: "ltr" },
  { code: "hi", native: "الهندية", dir: "ltr" },
  { code: "ur", native: "الأردية", dir: "ltr" },
  { code: "fa", native: "الفارسية", dir: "rtl" },
];

export const SOURCE_OPTIONS: Lang[] = [ARABIC, ...LANGUAGES];
export const TARGET_OPTIONS: Lang[] = [...LANGUAGES, ARABIC];

/** Arabic + supplements + presentation forms */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function hasArabic(text: string | null | undefined): boolean {
  return !!text && ARABIC_RE.test(text);
}

export function nativeName(code: string): string {
  if (!code || code === "auto") return "اكتشاف تلقائي";
  const found = SOURCE_OPTIONS.find((l) => code === l.code || code.startsWith(l.code + "-"));
  return found ? found.native : code.toUpperCase();
}

export function dirOf(code: string): LangDir {
  if (!code || code === "auto") return "ltr";
  const found = SOURCE_OPTIONS.find((l) => code === l.code || code.startsWith(l.code + "-"));
  return found?.dir ?? "ltr";
}
