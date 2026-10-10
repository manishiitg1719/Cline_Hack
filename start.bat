@echo off
REM ============================================================
REM  FarmGuard - one-click start (Windows)
REM  Opens the backend and the frontend in their OWN windows
REM  (keep both windows open while using the app), loads demo
REM  data and opens the browser.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo  [1/5] Stopping old FarmGuard servers (ports 8000 / 5173) if any...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8000 .*LISTENING" /c:":5173 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1

echo  [2/5] Checking dependencies...
python -c "import fastapi, uvicorn, sqlalchemy, jwt, bcrypt, sklearn" >nul 2>&1
if errorlevel 1 (
  echo        Installing Python packages - first time only, may take a few minutes...
  python -m pip install -r backend\requirements.txt
)
if not exist frontend\node_modules (
  echo        Installing frontend packages - first time only...
  pushd frontend && call npm install && popd
)

echo  [3/5] Starting BACKEND  (window "FarmGuard Backend", port 8000)...
start "FarmGuard Backend - KEEP OPEN" /min cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --port 8000"

echo  [4/5] Starting FRONTEND (window "FarmGuard Frontend", port 5173)...
start "FarmGuard Frontend - KEEP OPEN" /min cmd /k "cd /d %~dp0frontend && npm run dev"

echo  [5/5] Loading demo data (waits for the backend)...
python backend\scripts\seed_demo.py
if errorlevel 1 (
  echo.
  echo  Backend did not start - look at the "FarmGuard Backend" window for the error.
  pause
  exit /b 1
)

ping -n 4 127.0.0.1 >nul
start "" http://localhost:5173
echo.
echo  ===========================================================
echo   FarmGuard is running:  http://localhost:5173
echo   Farmer login : 9999900001 / demo1234   (Hindi)
echo   Helper login : 9999900002 / demo1234   (English)
echo.
echo   The two MINIMISED windows on the taskbar are the servers.
echo   DO NOT CLOSE THEM while using the app (that causes "server is OFF").
echo   You can close THIS window. To stop everything: stop.bat
echo   Your accounts and farm data are saved in backend\farmguard.db
echo  ===========================================================
echo.
pause
