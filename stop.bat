@echo off
REM Stops the FarmGuard backend (8000) and frontend (5173) servers.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8000 .*LISTENING" /c:":5173 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
echo FarmGuard servers stopped.
