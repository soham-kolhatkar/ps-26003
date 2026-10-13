#!/usr/bin/env bash
# Build a standalone release APK locally (no Expo account, no admin rights).
#
# Toolchain (user-space, one-time): JDK 17 in ~/opt/jdk-17, Android SDK in
# ~/Android/Sdk with platforms;android-36, build-tools;36.0.0,
# ndk;27.1.12297006, cmake;3.22.1. See docs/DECISIONS.md (D32).
#
# Output: dist/Smriti-v<version>.apk, also copied to the Windows Downloads
# folder. Pass --install to install on the USB-connected phone.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

export JAVA_HOME="${JAVA_HOME:-$HOME/opt/jdk-17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
[ -x "$JAVA_HOME/bin/java" ] || { echo "JDK 17 not found at $JAVA_HOME"; exit 1; }
[ -d "$ANDROID_HOME/platforms/android-36" ] || { echo "Android SDK platform 36 not found in $ANDROID_HOME"; exit 1; }

VERSION="$(node -p "require('./app.json').expo.version")"
ARCHS="${ARCHS:-arm64-v8a,armeabi-v7a}"

echo "▶ Generating native android/ project (Continuous Native Generation)…"
CI=1 npx expo prebuild --platform android --clean --no-install

echo "▶ Gradle assembleRelease ($ARCHS)…"
cd android
./gradlew --no-daemon assembleRelease \
  -PreactNativeArchitectures="$ARCHS" \
  -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=1g"
cd ..

mkdir -p dist
OUT="dist/Smriti-v${VERSION}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"
echo "✔ $OUT ($(du -h "$OUT" | cut -f1))"

WIN_DL="/mnt/c/Users/$USER/Downloads"
if [ -d "$WIN_DL" ]; then
  cp "$OUT" "$WIN_DL/" && echo "✔ copied to C:\\Users\\$USER\\Downloads\\$(basename "$OUT")"
fi

if [ "${1:-}" = "--install" ]; then
  ADB="${ADB:-/mnt/c/Users/$USER/platform-tools/adb.exe}"
  WIN_APK="$(wslpath -w "$PROJECT_DIR/$OUT")"
  (cd /tmp && "$ADB" install -r "$WIN_APK")
fi
