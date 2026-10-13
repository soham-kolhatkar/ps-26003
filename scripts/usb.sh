#!/usr/bin/env bash
# Run the dev server over USB (used when the corporate network blocks the ngrok tunnel).
# Needs Android platform-tools on Windows (portable, no admin) and USB debugging on the phone.
# If Windows shows an admin/firewall prompt for adb.exe, cancel it — adb only uses localhost.
set -euo pipefail
ADB="${ADB:-/mnt/c/Users/$USER/platform-tools/adb.exe}"
[ -x "$ADB" ] || { echo "adb not found at $ADB (set ADB=/path/to/adb.exe)"; exit 1; }
"$ADB" start-server >/dev/null
"$ADB" wait-for-device
"$ADB" reverse tcp:8081 tcp:8081
echo "USB reverse ready. Opening Expo Go on the phone once Metro is up…"
( sleep 8; "$ADB" shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" >/dev/null ) &
exec npx expo start --localhost --port 8081
