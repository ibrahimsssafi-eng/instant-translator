#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
#  Instant Translator Agent - runs in the background and
#  translates Arabic typing in ANY application (browser,
#  email, search box, chat...) by ERASING the Arabic text and
#  WRITING the translation in its exact place.
#
#  v1.1.0: keystrokes are now LAYOUT-INDEPENDENT (physical
#  virtual-key codes), so Ctrl+V paste works even while the
#  Windows input language is Arabic. Added F6/F7 delay keys.
#
#  HOW IT WORKS
#  1. Listens globally to your keyboard (pynput).
#  2. Buffers what you type (memory only, nothing stored).
#  3. When the buffer holds Arabic and you pause IDLE_SECONDS,
#     it sends Backspace x N (deleting the Arabic you just
#     typed) and pastes the translation where the cursor is.
#
#  RUN
#  pip install pynput pyperclip
#  python translator_agent.py      (Windows background: pythonw)
#
#  HOTKEYS
#  F6 = faster (-0.3s)   F7 = slower (+0.3s)
#  F8 = pause / resume   F9 = translate the buffer right now
#  Enter / Tab / mouse click = start a new segment
# ============================================================

import json
import os
import re
import sys
import time
import uuid
import getpass
import threading
import platform
import urllib.parse
import urllib.request

# --------------------------- CONFIG ---------------------------
TARGET_LANG   = "en"      # target language: en, fr, es, de, tr ...
IDLE_SECONDS  = 0.9       # pause before the Arabic is replaced
MIN_CHARS     = 2         # minimum chars before translating
KEY_DELAY     = 0.004     # seconds between synthetic key taps
CONSOLE_URL   = ""        # optional: "http://localhost:3000" to
                          # report status to the web console (/api/agent)
AGENT_VERSION = "1.1.0"
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

try:
    from pynput import keyboard, mouse
except ImportError:
    print("[!] Missing dependency. Run:  pip install pynput pyperclip")
    raise

try:
    import pyperclip
    HAVE_CLIP = True
except ImportError:
    pyperclip = None
    HAVE_CLIP = False
    print("[!] pyperclip not found - falling back to direct typing.")

kb = keyboard.Controller()

state = {
    "enabled": True,
    "buffer": "",
    "last_event": 0.0,
    "translating": False,
    "idle": float(IDLE_SECONDS),
    "translated": 0,
    "chars": 0,
}
lock = threading.Lock()
pressed_mods = set()


def log(msg):
    try:
        print(time.strftime("[%H:%M:%S]"), msg, flush=True)
    except Exception:
        pass


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
    """Physical key for an ASCII letter. Using virtual-key CODES
    (not characters) so combos like Ctrl+V work even when the
    active Windows input language is Arabic."""
    if IS_MAC:
        return keyboard.KeyCode.from_char(char)   # Cocoa resolves combos fine
    try:
        return keyboard.KeyCode.from_vk(ord(char.upper()))
    except Exception:
        return keyboard.KeyCode.from_char(char)


def press_combo(modifier, char):
    """Ctrl/Cmd + letter, independent of the keyboard layout."""
    with kb.pressed(modifier):
        kb.tap(vk_key(char))


def type_ascii(text):
    """Type ASCII text letter-by-letter using physical keys, so
    English output is correct even with an Arabic keyboard layout."""
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
    """Google gtx first, MyMemory as fallback. None on failure."""
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
        log("engine 1 failed: %s" % e)
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
        log("engine 2 failed: %s" % e)
    return None

# --------------------- erase & write in place ---------------------

def replace_selection(original, translated):
    """Erase the just-typed Arabic (cursor sits right after it),
    then write the translation in its place. The 'translating'
    flag makes our own synthetic keystrokes ignored back."""
    # 1) delete the Arabic characters
    for _ in original:
        kb.tap(keyboard.Key.backspace)
        time.sleep(KEY_DELAY)
    time.sleep(0.05)

    # 2) write the translation (clipboard paste, else direct typing)
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
            log("clipboard paste failed (%s) - typing directly" % e)
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
        with lock:
            state["enabled"] = not state["enabled"]
            state["buffer"] = ""
        log("RESUMED - translating" if state["enabled"] else "PAUSED - typing untouched")
        return

    if key == keyboard.Key.f6 or key == keyboard.Key.f7:
        step = 0.5 if state["idle"] <= 10 else 15
        delta = -step if key == keyboard.Key.f6 else step
        state["idle"] = min(300.0, max(0.5, state["idle"] + delta))
        d = state["idle"]
        log("replace delay: %.1fs" % d if d < 60 else "replace delay: %.1f min" % (d / 60))
        return

    if state["translating"]:
        return
    if not state["enabled"]:
        return

    if key == keyboard.Key.f9:
        state["last_event"] = 0.0  # force the scheduler to translate now
        return

    if pressed_mods:  # Ctrl/Cmd shortcut - not real typing
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
                out = translate(buf, TARGET_LANG)
                if out and out != buf:
                    replace_selection(buf, out)
                    with lock:
                        state["translated"] += 1
                        state["chars"] += len(buf)
                    log("[%d] %s  ->  %s" % (state["translated"], buf[:44], out[:44]))
            except Exception as e:
                log("replace failed: %s" % e)
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

# ----------------------------- main -----------------------------

def main():
    threading.Thread(target=scheduler, daemon=True).start()
    threading.Thread(target=heartbeat, daemon=True).start()
    try:
        mouse.Listener(on_click=on_click).start()
    except Exception:
        pass

    print("=" * 60)
    print(" Instant Translator Agent v%s - ID: %s" % (AGENT_VERSION, AGENT_ID))
    print("=" * 60)
    print(" Status : RUNNING - watching your keyboard system-wide")
    print(" Target : %s after %.1fs of silence  (range 0.5s - 5min)" % (TARGET_LANG, state["idle"]))
    print(" Hotkeys: F6/F7 delay -/+ | F8 pause/resume | F9 now | Ctrl+C quit")
    print(" Type Arabic in ANY app, pause - it is ERASED and the")
    print(" translation is written in its place.")
    print("=" * 60)

    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[bye] Agent stopped.")
