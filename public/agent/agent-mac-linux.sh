#!/usr/bin/env bash
# Instant Translator Agent - macOS / Linux setup & launcher
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo " Instant Translator Agent - setup"
echo "============================================================"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[X] python3 not found. Please install Python 3 first."
  exit 1
fi

echo "[*] Installing dependencies (pynput, pyperclip)..."
python3 -m pip install --user --quiet --upgrade pynput pyperclip

if [ -f translator_agent.pid ] && kill -0 "$(cat translator_agent.pid)" 2>/dev/null; then
  echo "[*] An agent is already running (PID $(cat translator_agent.pid)) - stopping it first."
  kill "$(cat translator_agent.pid)" 2>/dev/null || true
  sleep 1
fi

TARGET="translator_agent.py"
if [ -f translator_app.py ]; then TARGET="translator_app.py"; fi

echo "[*] Starting the agent ($TARGET) in the background..."
nohup python3 "$TARGET" > translator_agent.log 2>&1 &
echo $! > translator_agent.pid

echo
echo "[OK] Agent is running (PID $(cat translator_agent.pid))."
echo "     - Type Arabic anywhere, pause a moment, it becomes English."
echo "     - F8 pauses/resumes, F9 translates immediately."
echo "     - Logs: tail -f translator_agent.log"
echo "     - Stop: kill \$(cat translator_agent.pid)"
echo
case "$(uname -s)" in
  Darwin)
    echo " macOS NOTE: grant your terminal app both permissions:"
    echo "   System Settings > Privacy & Security > Accessibility"
    echo "   System Settings > Privacy & Security > Input Monitoring"
    echo " Then restart the agent."
    ;;
  Linux)
    echo " Linux NOTE: global key capture works on X11 sessions."
    echo "   On Wayland, log in with an 'on Xorg' session instead."
    ;;
esac
