@echo off
:loop
cls
echo ======================================================
echo MAX PERFORMANCE: Qwen 27B na RTX 3090 (24GB)
echo ======================================================
echo.
wsl -e bash -c "~/claude_unsloth/run_server.sh"
echo.
echo ------------------------------------------------------
echo Server ukoncen. Restartuji za 5 sekund...
timeout /t 5
goto loop