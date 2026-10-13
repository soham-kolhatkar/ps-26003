#!/usr/bin/env bash
# Run the dev server over USB (used when the corporate network blocks the ngrok tunnel).
# Needs Android platform-tools on Windows (portable, no admin) and USB debugging on the phone.
# If Windows shows an admin/firewall prompt for adb.exe, cancel it — adb only uses localhost.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ADB:-/mnt/c/Users/$USER/platform-tools/adb.exe}"
[ -x "$ADB" ] || { echo "adb not found at $ADB (set ADB=/path/to/adb.exe)"; exit 1; }
cd /tmp  # run Windows adb.exe from a Windows-mappable dir (avoids UNC cwd warnings)
# A stale adb daemon can hang every command; kill it (own process, no admin) and retry.
if ! timeout 15 "$ADB" devices >/dev/null 2>&1; then
  echo "adb is stuck — restarting it…"
  powershell.exe -NoProfile -Command "Stop-Process -Name adb -Force -ErrorAction SilentlyContinue" >/dev/null 2>&1 || true
fi
"$ADB" start-server >/dev/null
if "$ADB" devices | grep -q unauthorized; then
  echo "Phone shows 'unauthorized': unlock it and tap Allow (tick 'Always allow from this computer')."
fi
"$ADB" wait-for-device
"$ADB" reverse tcp:8081 tcp:8081
echo "USB reverse ready. Opening Expo Go on the phone once Metro is up…"
( sleep 8; "$ADB" shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" >/dev/null ) &
cd "$PROJECT_DIR"
exec npx expo start --localhost --port 8081
