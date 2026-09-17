#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
#  Instant Translator - DESKTOP APP (GUI) v2.0.0
#
#  A friendly window for EVERYONE - no command line needed:
#    [▶ تشغيل / ⏸ إيقاف]  big toggle button
#    target-language dropdown  (14 languages)
#    delay slider              1 second -> 5 minutes
#    live counters + activity log
#    minimizes to system tray (if pystray is installed)
#
#  While it runs, typing Arabic in ANY app is erased after the
#  pause you choose and the translation is written in its place.
#
#  Needs once:  pip install pynput pyperclip
#  (optional tray: pip install pystray pillow)
#
#  Build a standalone EXE that needs NO Python:
#    run build-windows-exe.bat  ->  dist\InstantTranslator.exe
# ============================================================

import json
import os
import queue
import re
import sys
import threading
import time
import uuid
import getpass
import platform
import urllib.parse
import urllib.request

try:
    import tkinter as tk
    from tkinter import ttk
except ImportError:
    print("[!] tkinter missing. Windows/macOS: it ships with python.org installers.")
    print("    Ubuntu/Debian: sudo apt install python3-tk")
    raise

# --------------------------- CONFIG ---------------------------
LANGS = [
    ("الإنجليزية", "en"), ("الفرنسية", "fr"), ("الإسبانية", "es"),
    ("الألمانية", "de"), ("الإيطالية", "it"), ("البرتغالية", "pt"),
    ("التركية", "tr"), ("الروسية", "ru"), ("الصينية", "zh-CN"),
    ("اليابانية", "ja"), ("الكورية", "ko"), ("الهندية", "hi"),
    ("الفارسية", "fa"), ("الأردية", "ur"),
]
DEFAULT_DELAY = 2.0          # seconds
MIN_DELAY     = 1.0
MAX_DELAY     = 300.0        # 5 minutes
KEY_DELAY     = 0.004
MIN_CHARS     = 2
CONSOLE_URL   = ""           # optional web console (site) URL
AGENT_VERSION = "2.0.0"
APP_TITLE     = "المترجم الفوري — ترجمة نظامية فورية"
# --------------------------------------------------------------

ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]")
MODIFIER_NAMES = {
    "ctrl", "ctrl_l", "ctrl_r", "cmd", "cmd_l", "cmd_r",
    "alt", "alt_l", "alt_r", "alt_gr",
}
RESET_NAMES = {
    "enter", "tab", "escape", "left", "right", "up", "down",
    "home", "end", "delete", "page_up", "page_down", "insert",
    "caps_lock", "num_lock", "scroll_lock", "menu",
}
IS_MAC = sys.platform == "darwin"

BG      = "#0b0e14"
CARD    = "#12161f"
CARD2   = "#171c27"
TEXT    = "#e8ecf4"
MUTED   = "#7d879c"
CYAN    = "#22d3ee"
GREEN   = "#34d399"
RED     = "#f87171"
AMBER   = "#fbbf24"

from pynput import keyboard, mouse  # noqa: E402

try:
    import pyperclip
    HAVE_CLIP = True
except ImportError:
    pyperclip = None
    HAVE_CLIP = False

try:
    import pystray
    from PIL import Image, ImageDraw
    HAVE_TRAY = True
except ImportError:
    pystray = None
    HAVE_TRAY = False

kb = keyboard.Controller()

state = {
    "enabled": True,
    "buffer": "",
    "last_event": 0.0,
    "translating": False,
    "idle": DEFAULT_DELAY,
    "target": LANGS[0][1],
    "translated": 0,
    "chars": 0,
}
lock = threading.Lock()
pressed_mods = set()
log_q: "queue.Queue[str]" = queue.Queue()


def log(msg):
    log_q.put(time.strftime("[%H:%M:%S] ") + msg)


def agent_id():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".agent_id")
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read().strip()
        aid = "agent-" + uuid.uuid4().hex[:12]
        with open(path, "w", encoding="utf-8") as f:
            f.write(aid)
        return aid
    except Exception:
        return "agent-" + getpass.getuser()


AGENT_ID = agent_id()

# ---------------- layout-independent keystrokes ----------------

def vk_key(char):
    if IS_MAC:
        return keyboard.KeyCode.from_char(char)
    try:
        return keyboard.KeyCode.from_vk(ord(char.upper()))
    except Exception:
        return keyboard.KeyCode.from_char(char)


def press_combo(modifier, char):
    with kb.pressed(modifier):
        kb.tap(vk_key(char))


def type_ascii(text):
    for ch in text:
        if ch.isalnum() and ch.isascii():
            kb.tap(vk_key(ch))
        elif ch == " ":
            kb.tap(keyboard.Key.space)
        else:
            try:
                kb.type(ch)
            except Exception:
                pass
        time.sleep(KEY_DELAY)

# --------------------------- engine ---------------------------

def translate(text, target):
    q = urllib.parse.quote(text, safe="")
    try:
        url = (
            "https://translate.googleapis.com/translate_a/single"
            "?client=gtx&dt=t&dj=1&sl=ar&tl=" + urllib.parse.quote(target) + "&q=" + q
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
        if isinstance(data, dict):
            out = "".join(s.get("trans", "") for s in data.get("sentences", []))
        else:
            out = "".join(seg[0] for seg in data[0] if seg and seg[0])
        if out.strip():
            return out.strip()
    except Exception as e:
        log("المحرك 1 تعذر: %s" % e)
    try:
        url2 = (
            "https://api.mymemory.translated.net/get?q=" + q
            + "&langpair=ar|" + urllib.parse.quote(target)
        )
        with urllib.request.urlopen(url2, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
        out = (data.get("responseData") or {}).get("translatedText", "")
        if out.strip():
            return out.strip()
    except Exception as e:
        log("المحرك 2 تعذر: %s" % e)
    return None

# --------------------- erase & write in place ---------------------

def replace_selection(original, translated):
    for _ in original:
        kb.tap(keyboard.Key.backspace)
        time.sleep(KEY_DELAY)
    time.sleep(0.05)
    modifier = keyboard.Key.cmd if IS_MAC else keyboard.Key.ctrl
    pasted = False
    old_clip = None
    if HAVE_CLIP:
        try:
            old_clip = pyperclip.paste()
        except Exception:
            old_clip = None
        try:
            pyperclip.copy(translated)
            time.sleep(0.05)
            press_combo(modifier, "v")
            time.sleep(0.15)
            pasted = True
        except Exception as e:
            log("اللصق تعذر (%s) - كتابة مباشرة" % e)
        if old_clip:
            try:
                time.sleep(0.05)
                pyperclip.copy(old_clip)
            except Exception:
                pass
    if not pasted:
        type_ascii(translated)

# --------------------------- listeners ---------------------------

def on_press(key):
    name = getattr(key, "name", "") or ""
    if name in MODIFIER_NAMES:
        pressed_mods.add(name)
        return

    if key == keyboard.Key.f8:
        toggle_enabled()
        return
    if key == keyboard.Key.f6:
        adjust_delay(-1)
        return
    if key == keyboard.Key.f7:
        adjust_delay(+1)
        return

    if state["translating"]:
        return
    if not state["enabled"]:
        return

    if key == keyboard.Key.f9:
        state["last_event"] = 0.0
        return

    if pressed_mods:
        state["buffer"] = ""
        state["last_event"] = time.time()
        return

    ch = getattr(key, "char", None)
    if ch:
        state["buffer"] = (state["buffer"] + ch)[-600:]
    elif name == "space":
        state["buffer"] = (state["buffer"] + " ")[-600:]
    elif name == "backspace":
        state["buffer"] = state["buffer"][:-1]
    elif name in RESET_NAMES or name.startswith("f"):
        state["buffer"] = ""
    state["last_event"] = time.time()


def on_release(key):
    name = getattr(key, "name", "") or ""
    pressed_mods.discard(name)


def on_click(x, y, button, pressed):
    if pressed:
        state["buffer"] = ""
        state["last_event"] = time.time()


def adjust_delay(direction):
    v = state["idle"]
    step = 0.5 if v <= 10 else 15
    state["idle"] = min(MAX_DELAY, max(MIN_DELAY, v + direction * step))
    log("مدة الاستبدال: %s" % fmt_delay(state["idle"]))


def toggle_enabled():
    with lock:
        state["enabled"] = not state["enabled"]
        state["buffer"] = ""
    log("استئناف العمل" if state["enabled"] else "إيقاف مؤقت - كتابتك لن تُلمس")

# --------------------------- workers ---------------------------

def scheduler():
    while True:
        time.sleep(0.1)
        if state["translating"] or not state["enabled"]:
            continue
        buf = state["buffer"]
        if (
            buf
            and len(buf.strip()) >= MIN_CHARS
            and ARABIC_RE.search(buf)
            and time.time() - state["last_event"] >= state["idle"]
        ):
            with lock:
                state["translating"] = True
            try:
                out = translate(buf, state["target"])
                if out and out != buf:
                    replace_selection(buf, out)
                    with lock:
                        state["translated"] += 1
                        state["chars"] += len(buf)
                    log("#%d  «%s» ← %s" % (state["translated"], out[:38], buf[:38]))
            except Exception as e:
                log("فشل الاستبدال: %s" % e)
            finally:
                with lock:
                    state["translating"] = False
                    state["buffer"] = ""


def heartbeat():
    if not CONSOLE_URL:
        return
    endpoint = CONSOLE_URL.rstrip("/") + "/api/agent"
    while True:
        try:
            payload = json.dumps({
                "agentId": AGENT_ID,
                "platform": platform.system().lower(),
                "version": AGENT_VERSION,
                "translated": state["translated"],
                "chars": state["chars"],
            }).encode("utf-8")
            req = urllib.request.Request(
                endpoint, data=payload, headers={"content-type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=5).read()
        except Exception:
            pass
        time.sleep(15)


def fmt_delay(v):
    if v < 60:
        return "%g ثانية" % v
    minutes = int(v // 60)
    rest = int(v % 60)
    if rest:
        return "%d دقائق و %d ثانية" % (minutes, rest)
    if minutes == 1:
        return "دقيقة واحدة"
    if minutes == 2:
        return "دقيقتان"
    return "%d دقائق" % minutes

# ----------------------------- GUI -----------------------------

class TranslatorApp:
    def __init__(self, root):
        self.root = root
        self.tray = None
        root.title(APP_TITLE)
        root.geometry("440x600")
        root.minsize(400, 560)
        root.configure(bg=BG)
        try:
            root.attributes("-topmost", False)
        except Exception:
            pass

        font_main = ("Segoe UI", 10)
        font_bold = ("Segoe UI", 11, "bold")
        font_big  = ("Segoe UI", 15, "bold")

        # header
        head = tk.Frame(root, bg=BG)
        head.pack(fill="x", padx=18, pady=(16, 8))
        tk.Label(head, text="المترجم الفوري", bg=BG, fg=TEXT, font=("Segoe UI", 17, "bold"), anchor="e").pack(fill="x")
        tk.Label(head, text="يعمل في الخلفية مع لوحة مفاتيحك — أي تطبيق، أي مربع إدخال",
                 bg=BG, fg=MUTED, font=("Segoe UI", 9), anchor="e").pack(fill="x")

        # status card
        card = tk.Frame(root, bg=CARD, highlightthickness=1, highlightbackground="#1f2634")
        card.pack(fill="x", padx=18, pady=6)
        self.status_dot = tk.Label(card, text="●", bg=CARD, fg=GREEN, font=("Segoe UI", 12))
        self.status_dot.pack(side="right", padx=(4, 14), pady=12)
        self.status_lbl = tk.Label(card, text="يعمل الآن — اكتب بالعربية في أي مكان",
                                   bg=CARD, fg=TEXT, font=font_bold, anchor="e", justify="right")
        self.status_lbl.pack(side="right", fill="x", expand=True, padx=6, pady=12)

        # big toggle
        self.toggle_btn = tk.Button(
            root, text="⏸  إيقاف مؤقت", command=toggle_enabled,
            bg=CARD2, fg=TEXT, activebackground="#232a3a", activeforeground=TEXT,
            font=font_big, relief="flat", cursor="hand2", height=2, bd=0,
        )
        self.toggle_btn.pack(fill="x", padx=18, pady=8)

        # language
        lang_card = tk.Frame(root, bg=CARD, highlightthickness=1, highlightbackground="#1f2634")
        lang_card.pack(fill="x", padx=18, pady=6)
        tk.Label(lang_card, text="اللغة الهدف", bg=CARD, fg=MUTED, font=font_bold, anchor="e").pack(fill="x", padx=14, pady=(10, 2))
        self.lang_var = tk.StringVar(value=LANGS[0][0])
        combo = ttk.Combobox(lang_card, textvariable=self.lang_var, justify="right",
                             values=[n for n, _ in LANGS], state="readonly", font=font_main)
        combo.pack(fill="x", padx=14, pady=(0, 12))
        combo.bind("<<ComboboxSelected>>", self.on_lang)

        # delay slider
        delay_card = tk.Frame(root, bg=CARD, highlightthickness=1, highlightbackground="#1f2634")
        delay_card.pack(fill="x", padx=18, pady=6)
        row = tk.Frame(delay_card, bg=CARD)
        row.pack(fill="x", padx=14, pady=(10, 0))
        self.delay_val = tk.Label(row, text=fmt_delay(DEFAULT_DELAY), bg=CARD, fg=CYAN, font=font_bold, anchor="w")
        self.delay_val.pack(side="left")
        tk.Label(row, text="مدة الصمت قبل الاستبدال", bg=CARD, fg=MUTED, font=font_bold, anchor="e").pack(side="right")
        self.delay_var = tk.DoubleVar(value=DEFAULT_DELAY)
        scale = tk.Scale(
            delay_card, variable=self.delay_var, from_=MAX_DELAY, to=MIN_DELAY,
            resolution=1, orient="horizontal", command=self.on_delay,
            bg=CARD, fg=TEXT, troughcolor="#232a3a", highlightthickness=0,
            activebackground=CYAN, sliderrelief="flat", length=380, showvalue=0,
        )
        scale.pack(fill="x", padx=14)
        presets = tk.Frame(delay_card, bg=CARD)
        presets.pack(fill="x", padx=10, pady=(2, 10))
        for label, secs in [("٥ دقائق", 300), ("دقيقة", 60), ("١٠ ث", 10), ("٣ ث", 3), ("ثانية", 1)]:
            tk.Button(
                presets, text=label, command=lambda s=secs: self.set_delay(s),
                bg=CARD2, fg=MUTED, activebackground=CYAN, activeforeground=BG,
                font=("Segoe UI", 9), relief="flat", cursor="hand2", padx=8,
            ).pack(side="right", padx=4)

        # counters
        stats = tk.Frame(root, bg=BG)
        stats.pack(fill="x", padx=18, pady=6)
        self.count_lbl = self._stat(stats, "ترجمة مُنجزة", "0", 0)
        self.chars_lbl = self._stat(stats, "حرفًا عربيًا", "0", 1)

        # log
        log_card = tk.Frame(root, bg=CARD, highlightthickness=1, highlightbackground="#1f2634")
        log_card.pack(fill="both", expand=True, padx=18, pady=6)
        tk.Label(log_card, text="سجل النشاط", bg=CARD, fg=MUTED, font=font_bold, anchor="e").pack(fill="x", padx=14, pady=(8, 2))
        self.log_box = tk.Listbox(
            log_card, bg="#0a0d13", fg="#9fdceb", font=("Consolas", 9),
            relief="flat", highlightthickness=0, selectbackground="#1f2634",
            activestyle="none", height=7,
        )
        self.log_box.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        # footer buttons
        foot = tk.Frame(root, bg=BG)
        foot.pack(fill="x", padx=18, pady=(4, 14))
        self._foot_btn(foot, "خروج", self.quit_app, "#2a1620", RED).pack(side="right", padx=3)
        tray_txt = "إخفاء في شريط المهام" if not HAVE_TRAY else "تصغير إلى الأيقونة"
        self._foot_btn(foot, tray_txt, self.hide_window, CARD2, TEXT).pack(side="right", padx=3)
        self._foot_btn(foot, "اختبار المحرك", self.test_engine, CARD2, CYAN).pack(side="right", padx=3)

        log("التطبيق يعمل — اكتب بالعربية بأي مكان وستُستبدل بالترجمة")
        if not HAVE_TRAY:
            log("نصيحة: ثبّت pystray + pillow لإخفائه بجانب الساعة")
        self.root.protocol("WM_DELETE_WINDOW", self.hide_window if HAVE_TRAY else self.quit_app)
        self.root.after(120, self.refresh)

    def _stat(self, parent, label, value, idx):
        f = tk.Frame(parent, bg=CARD, highlightthickness=1, highlightbackground="#1f2634")
        f.grid(row=0, column=idx, sticky="nsew", padx=3)
        parent.grid_columnconfigure(idx, weight=1)
        val = tk.Label(f, text=value, bg=CARD, fg=TEXT, font=("Segoe UI", 16, "bold"))
        val.pack(pady=(10, 0))
        tk.Label(f, text=label, bg=CARD, fg=MUTED, font=("Segoe UI", 9)).pack(pady=(0, 10))
        return val

    def _foot_btn(self, parent, text, cmd, bg, fg):
        return tk.Button(
            parent, text=text, command=cmd, bg=bg, fg=fg,
            activebackground="#232a3a", activeforeground=TEXT,
            font=("Segoe UI", 9, "bold"), relief="flat", cursor="hand2", padx=12, pady=6,
        )

    # ---- events ----
    def on_lang(self, _evt=None):
        name = self.lang_var.get()
        for n, code in LANGS:
            if n == name:
                state["target"] = code
                break
        log("اللغة الهدف: %s" % name)

    def on_delay(self, raw):
        state["idle"] = float(raw)
        self.delay_val.config(text=fmt_delay(state["idle"]))

    def set_delay(self, secs):
        self.delay_var.set(float(secs))
        state["idle"] = float(secs)
        self.delay_val.config(text=fmt_delay(float(secs)))

    def test_engine(self):
        log("اختبار المحرك...")

        def run():
            out = translate("مرحبا بالعالم، أنا أعمل بشكل ممتاز", state["target"])
            if out:
                log("نجح الاختبار: %s" % out)
            else:
                log("فشل الاختبار - تحقق من الإنترنت")

        threading.Thread(target=run, daemon=True).start()

    def hide_window(self):
        self.root.withdraw()
        if HAVE_TRAY:
            self._ensure_tray()
            log("مخفي - ما زال يعمل (انقر أيقونته بجانب الساعة)")

    def _ensure_tray(self):
        if self.tray or not HAVE_TRAY:
            return
        img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([2, 2, 62, 62], radius=16, fill=(34, 211, 238, 255))
        d.text((20, 20), "A", fill=(7, 8, 13, 255))
        menu = pystray.Menu(
            pystray.MenuItem("فتح النافذة", lambda *_: self.show_window(), default=True),
            pystray.MenuItem("إيقاف / تشغيل (F8)", lambda *_: toggle_enabled()),
            pystray.MenuItem("خروج نهائي", lambda *_: self.quit_app()),
        )
        self.tray = pystray.Icon("instant-translator", img, "المترجم الفوري", menu)
        threading.Thread(target=self.tray.run, daemon=True).start()

    def show_window(self):
        self.root.after(0, lambda: (self.root.deiconify(), self.root.lift()))

    def quit_app(self):
        log("إيقاف التطبيق...")
        state["enabled"] = False
        try:
            if self.tray:
                self.tray.stop()
        except Exception:
            pass
        self.root.after(0, self.root.destroy)

    # ---- refresh loop ----
    def refresh(self):
        while True:
            try:
                msg = log_q.get_nowait()
            except queue.Empty:
                break
            self.log_box.insert("end", msg)
            if self.log_box.size() > 80:
                self.log_box.delete(0, self.log_box.size() - 80)
            self.log_box.see("end")

        enabled = state["enabled"]
        self.status_dot.config(fg=GREEN if enabled else AMBER)
        self.status_lbl.config(
            text=("يعمل الآن — اكتب بالعربية في أي تطبيق" if enabled
                  else "متوقف مؤقتًا — الكتابة تمرّ دون ترجمة (F8)")
        )
        self.toggle_btn.config(
            text=("⏸  إيقاف مؤقت" if enabled else "▶  تشغيل الوكيل"),
            bg=("#12251d" if enabled else "#241a10"),
        )
        self.count_lbl.config(text=str(state["translated"]))
        self.chars_lbl.config(text=str(state["chars"]))
        if abs(self.delay_var.get() - state["idle"]) > 0.01:
            self.delay_var.set(state["idle"])
            self.delay_val.config(text=fmt_delay(state["idle"]))
        self.root.after(140, self.refresh)

# ----------------------------- main -----------------------------

def main():
    threading.Thread(target=scheduler, daemon=True).start()
    threading.Thread(target=heartbeat, daemon=True).start()
    try:
        keyboard.Listener(on_press=on_press, on_release=on_release, daemon=True).start()
    except Exception as e:
        print("[!] keyboard hook failed: %s" % e)
        raise
    try:
        mouse.Listener(on_click=on_click, daemon=True).start()
    except Exception:
        pass

    root = tk.Tk()
    TranslatorApp(root)
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
