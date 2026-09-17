@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo  Instant Translator - Desktop App - Windows setup
echo ============================================================
where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python was not found. Install it from https://python.org
  echo     and check "Add python.exe to PATH" during setup, then rerun.
  pause
  exit /b 1
)
echo [*] Installing dependencies (pynput, pyperclip, pystray, pillow)...
python -m pip install --quiet --upgrade pynput pyperclip pystray pillow
if errorlevel 1 (
  echo [X] pip install failed. Try running this file as Administrator.
  pause
  exit /b 1
)

set APP=translator_app.py
if not exist "%APP%" set APP=translator_agent.py

echo [*] Registering "%APP%" to start automatically with Windows...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "InstantTranslatorAgent" /t REG_SZ /d "pythonw \"%~dp0%APP%\"" /f >nul
echo [*] Launching the app now (no console window)...
start "" pythonw "%~dp0%APP%"
echo.
echo [OK] Done! The Instant Translator window will appear:
echo      - Big ON/OFF button, language dropdown, delay slider (1s - 5 min)
echo      - It starts automatically every time Windows boots
echo      - F8 pauses/resumes globally, F6/F7 change the delay anywhere
echo.
pause
