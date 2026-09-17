"use client";

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

let audioCtx: AudioContext | null = null;

/** Soft confirmation blip played when text is auto-replaced. */
export function blip() {
  try {
    audioCtx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, t);
    osc.frequency.exponentialRampToValueAtTime(1280, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  } catch {
    /* audio unavailable — ignore */
  }
}

export function speakText(text: string, lang: string) {
  try {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export interface HistoryEntry {
  source: string;
  translated: string;
  from: string;
  to: string;
  mode: "auto" | "manual" | "copy" | "send";
}

export const HISTORY_EVENT = "translator:history";

export async function saveHistory(entry: HistoryEntry) {
  try {
    if (!entry.source.trim() || !entry.translated.trim()) return;
    if (entry.source.trim() === entry.translated.trim()) return;
    await fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    });
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
  } catch {
    /* offline — skip */
  }
}
