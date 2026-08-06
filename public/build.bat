@echo off
echo Building agent...
nim c -d:release -o:agent.exe agent.nim
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build complete!
pause
