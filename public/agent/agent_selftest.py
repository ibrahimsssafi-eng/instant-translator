#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
#  Instant Translator Agent - DESKTOP SELF TEST (60 seconds)
#
#  Run it BEFORE installing the agent to prove on YOUR machine:
#    STEP 1 - dependencies import correctly
#    STEP 2 - the translation engine answers (Arabic -> English)
#    STEP 3 - the erase-and-replace mechanism works INSIDE A REAL
#             APP FIELD: you click into Notepad / TextEdit, the
#             script pastes an Arabic sentence, erases it with
#             Backspaces and pastes the English translation right
#             where your cursor is - exactly what the background
#             agent does automatically while you type.
#
#  Usage:
#    python agent_selftest.py            full interactive test
#    python agent_selftest.py --check    deps + engine only (headless)
# ============================================================

import json
import sys
import time
import urllib.parse
import urllib.request

TEST_ARABIC = "مرحبا بالعالم، هذا اختبار سريع"
TARGET = "en"

# ---- identical engine to translator_agent.py ----------------
def translate(text, target=TARGET):
    q = urllib.parse.quote(text, safe="")
    try:
        url = (
            "https://translate.googleapis.com/translate_a/single"
            "?client=gtx&dt=t&dj=1&sl=ar&tl=%s&q=%s" % (target, q)
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
        print("     engine 1 error: %s" % e)
    try:
        url2 = "https://api.mymemory.translated.net/get?q=%s&langpair=ar|%s" % (q, target)
        with urllib.request.urlopen(url2, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
        out = (data.get("responseData") or {}).get("translatedText", "")
        if out.strip():
            return out.strip()
    except Exception as e:
        print("     engine 2 error: %s" % e)
    return None


try:
    from pynput import keyboard
    HAVE_PYNPUT = True
except Exception:
    keyboard = None
    HAVE_PYNPUT = False

try:
    import pyperclip
    HAVE_CLIP = True
except Exception:
    pyperclip = None
    HAVE_CLIP = False


def line():
    print("-" * 62)


def step(title):
    print()
    line()
    print(title)
    line()


def vk_key(char):
    """Physical key for an ASCII letter (virtual-key CODE), so
    Ctrl+V works even when the input language is Arabic."""
    if sys.platform == "darwin":
        return keyboard.KeyCode.from_char(char)
    try:
        return keyboard.KeyCode.from_vk(ord(char.upper()))
    except Exception:
        return keyboard.KeyCode.from_char(char)


def paste(controller, text):
    old = None
    if pyperclip is not None:
        try:
            old = pyperclip.paste()
        except Exception:
            old = None
        pyperclip.copy(text)
        time.sleep(0.05)
    mod = keyboard.Key.cmd if sys.platform == "darwin" else keyboard.Key.ctrl
    with controller.pressed(mod):
        controller.tap(vk_key("v"))
    time.sleep(0.15)
    if old:
        try:
            pyperclip.copy(old)
        except Exception:
            pass


def countdown(secs, msg):
    for i in range(secs, 0, -1):
        print("     %s %d ..." % (msg, i), end="\r", flush=True)
        time.sleep(1)
    print(" " * 46, end="\r")


def main(check_only=False):
    print("=" * 62)
    print(" Instant Translator Agent - DESKTOP SELF TEST")
    print("=" * 62)

    step("STEP 1/3 - Dependencies")
    print("  pynput    (global keyboard) : %s" % ("OK" if HAVE_PYNPUT else "MISSING"))
    print("  pyperclip (clipboard)       : %s" % ("OK" if HAVE_CLIP else "MISSING"))
    if not (HAVE_PYNPUT and HAVE_CLIP):
        print()
        print("  Install with:  python -m pip install pynput pyperclip")
        if not check_only:
            sys.exit(1)

    step("STEP 2/3 - Translation engine (Arabic -> %s)" % TARGET.upper())
    out = translate(TEST_ARABIC)
    if not out:
        print("  [X] No engine answered - check your internet connection.")
        sys.exit(2)
    print("  IN : %s" % TEST_ARABIC)
    print("  OUT: %s" % out)
    print("  [OK] Engine reachable from this machine.")

    if check_only:
        print()
        print("[OK] Headless check passed.")
        sys.exit(0)
    if not (HAVE_PYNPUT and HAVE_CLIP):
        print()
        print("[!] Step 3 skipped until dependencies are installed.")
        sys.exit(1)

    step("STEP 3/3 - Replace INSIDE a real app field")
    print("  1) Open Notepad / TextEdit (or ANY app with a text field)")
    print("  2) Click inside the empty field so it has focus")
    print("  3) Come back to this window and press ENTER")
    try:
        input("  -> press ENTER when the field is focused ...")
    except (EOFError, KeyboardInterrupt):
        sys.exit(3)
    countdown(5, "switch to the field within")

    kb = keyboard.Controller()
    print("  * pasting the Arabic sentence into your field ...")
    paste(kb, TEST_ARABIC)
    time.sleep(1.2)
    print("  * erasing it (Backspace x%d) ..." % len(TEST_ARABIC))
    for _ in TEST_ARABIC:
        kb.tap(keyboard.Key.backspace)
        time.sleep(0.02)
    print("  * pasting the translation in its place ...")
    paste(kb, out)

    print()
    try:
        ans = input("  Did the Arabic turn into English inside that field? [y/n] ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        ans = ""
    line()
    if ans.startswith("y"):
        print("  [VERIFIED] The replace mechanism works on this machine!")
        print("  The background agent behaves EXACTLY like this automatically:")
        print("   - you type Arabic (real keyboard) in any app")
        print("   - you pause ~0.9s")
        print("   - the agent erases it and pastes the translation in place")
        print()
        print("  Now run the real agent:")
        print("    Windows   : python translator_agent.py   (or install-windows.bat)")
        print("    mac/linux : python3 translator_agent.py  (or ./agent-mac-linux.sh)")
    else:
        print("  [!] Nothing changed in the field. Fix the OS permission:")
        print("    macOS : System Settings > Privacy & Security > Accessibility")
        print("            + Input Monitoring -> allow your terminal, rerun test")
        print("    Linux : log in with an X11 session (Wayland blocks key capture)")
        print("    then run this test again.")


if __name__ == "__main__":
    try:
        main("--check" in sys.argv)
    except KeyboardInterrupt:
        print("\n[aborted]")
