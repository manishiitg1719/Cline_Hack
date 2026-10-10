@echo off
REM Stops the FarmGuard backend (8000), frontend (5173) and Cline SDK agent (8010).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8000 .*LISTENING" /c:":5173 .*LISTENING" /c:":8010 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
echo FarmGuard servers stopped.
