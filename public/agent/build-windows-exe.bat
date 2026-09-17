@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo  Build a standalone EXE - Instant Translator (no Python needed)
echo ============================================================
where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python was not found. Install it from https://python.org first.
  pause
  exit /b 1
)
if not exist translator_app.py (
  echo [X] translator_app.py not found in this folder.
  pause
  exit /b 1
)
echo [*] Installing build tools (pyinstaller)...
python -m pip install --quiet --upgrade pyinstaller pynput pyperclip pystray pillow
echo [*] Building InstantTranslator.exe (one file, no console)...
python -m PyInstaller --noconfirm --onefile --windowed --name "InstantTranslator" translator_app.py
if errorlevel 1 (
  echo [X] Build failed - see messages above.
  pause
  exit /b 1
)
echo.
echo [OK] Done! Your standalone app is ready at:
echo      dist\InstantTranslator.exe
echo  Share it with ANYONE - it runs without Python installed.
echo.
explorer dist
pause
