# Setting up Smriti on your machine

For teammates who clone or fork this repo. The app is built and tested for **Android** (a Samsung phone, in Expo Go and as an APK); iOS is untested.

**Only want to try the app?** You need none of this. Ask the repo owner for the APK (`Smriti-v0.4.0.apk`), copy it to an Android phone, open it and allow "Install unknown apps". The single-phone demo works offline: on "Who will use this phone?" hold the flower for 1.5 s → **Open demo**. Staff PIN: **1234**. The demo script is in [DEMO.md](DEMO.md).

## 1. What you need
- **Git**, and access to the repo. If it is private, the owner adds you as a collaborator on GitHub. Fork it if you want your own copy to push to; clone it if you push to the team's repo.
- **Node.js 24 LTS** (developed on 24.20; React Native 0.86 accepts 20.19.4+, 22.13+ or 24.3+). npm comes with it.
- An **Android phone with Expo Go** from the Play Store. The project uses Expo SDK 57, so keep Expo Go up to date.
- Optional: Android platform-tools (`adb`) for a USB connection. JDK 17 and the Android SDK only if you build the APK (step 6).

## 2. Clone and install
```bash
git clone https://github.com/soham-kolhatkar/ps-26003.git   # or your fork's URL
cd ps-26003
npm install
```
Keep `.npmrc`: it pins the public npm registry. Add packages with `npx expo install <pkg>` so their versions match SDK 57.

## 3. Offline only, or with the cloud?
**Without a `.env` file** the app runs, but only the single-phone offline demo works (hold the flower → Open demo). Signing in as family, ASHA worker or doctor, and pairing a patient's phone, need a Supabase project. There are two ways to get one.

### A. Use the team's project (quickest)
Ask the repo owner for the Project URL and the anon key, then:
```bash
cp .env.example .env      # paste the two values into .env
```
You then share the team's cloud data and the demo accounts (numbers 90000 10001, 10002 and 10003, PIN 123456). Free projects pause after 7 days without use; the owner resumes it from the Supabase dashboard.

### B. Your own project (free)
1. On [supabase.com](https://supabase.com): **New project**. Mumbai (ap-south-1) is the closest region.
2. **Authentication → Sign In / Providers:** Email **on** with **Confirm email off**, and **Allow anonymous sign-ins on**. The app turns a phone number + PIN into an email and password; patient phones sign in anonymously.
3. **SQL Editor:** paste and run each file in `supabase/migrations/`, in order, `001` to `006`.
4. **Edge Functions → Deploy a new function → Via Editor:** name it `reset-pin`, paste `supabase/functions/reset-pin/index.ts`, **Deploy**. It is only used for "Forgot your PIN?". It reads the project's secret key from its own environment, so you never copy that key anywhere.
5. **Project Settings → API Keys:** copy the Project URL and the **legacy anon key** (it starts with `eyJ`) into `.env` (template: `.env.example`). The app is tested with that key; the newer `sb_publishable_…` key has not been tried with the PIN-reset function.
6. Start the app (step 4), then on "Who will use this phone?" hold the **title** for 1.5 s → **Demo tools** → **Load / reset the cloud demo**. This fills your project with the demo story and creates the demo accounts.

**Never put the service_role / secret key in `.env` or in the app.** Everything in `.env` is built into the APK; the access rules (RLS) protect the data.

After you create or change `.env`, restart the dev server (add `--clear` if the old values stick).

## 4. Run it on your phone
Start the dev server, then open the project in Expo Go:

| Your situation | On the computer | On the phone |
|---|---|---|
| Phone and computer on the same Wi-Fi | `npx expo start` | Expo Go → Scan QR code |
| Different networks, WSL2, or Wi-Fi that blocks devices from seeing each other | `npm run tunnel` | Expo Go → Scan QR code |
| USB cable | `adb reverse tcp:8081 tcp:8081`, then `npx expo start --localhost` | Expo Go → enter URL `exp://localhost:8081` |

For USB, turn on **Developer options → USB debugging** on the phone and accept the prompt. `npm run usb` does the USB row in one go, but it is written for WSL2 with the Windows `adb.exe` in `C:\Users\<you>\platform-tools`; elsewhere run the two commands yourself.

The app opens on the welcome screen → **Continue** → "Who will use this phone?". Hold the flower for the offline demo, or pick a role to use the cloud.

**In a browser:** `npm run web`, then open http://localhost:8081 in Chrome. This is a test bed only; it is never shipped.

## 5. Checks and tests
```bash
npm run check     # TypeScript, ESLint, Jest (210 tests), expo-doctor. Must pass before every push.
```
Browser tests (Playwright drives simulated phones in headless Chromium):
```bash
npx playwright install chromium   # once
npm run web                       # leave it running in another terminal
npm run e2e                       # about 20 minutes
```
The cloud tests use the Supabase project in `.env` and create real test accounts named "E2E …" (safe to delete under Authentication → Users). Run them against your own project (option B) if you don't want those in the team's.

## 6. Build a standalone APK (optional)
For phones without Expo Go. You need bash (Linux, macOS or WSL2), **JDK 17** and the **Android SDK** with platform 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1.
```bash
export JAVA_HOME=/path/to/jdk-17           # default: ~/opt/jdk-17
export ANDROID_HOME=/path/to/Android/Sdk   # default: ~/Android/Sdk
npm run build:apk                          # → dist/Smriti-v<version>.apk (about 70 MB, about 5 minutes)
adb install -r dist/Smriti-v0.4.0.apk      # installs over an older version and keeps its data
```
- The `.env` values are built into the APK, so build with the Supabase project the phones should use.
- For a new release, raise `expo.version` and `android.versionCode` in `app.json`.
- The APK is not signed for the Play Store yet (planned for Tier 5).
- On WSL2, `npm run build:apk -- --install` also installs it on the USB-connected phone.

## 7. Working on the code
- Read [CLAUDE.md](../CLAUDE.md) first: the project rules (elder-first UI, offline-first, every string in both language packs, no emoji in UI code). Then [PROGRESS.md](PROGRESS.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md).
- One feature per branch (`feat/fNN-short-name`), `npm run check` before pushing, conventional commit messages (`feat:`, `fix:`, `docs:`).
- Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/

## When something goes wrong
- **Expo Go says the project is incompatible:** update Expo Go from the Play Store.
- **"Supabase is not configured":** there is no `.env`, or the dev server started before you created it. Restart it.
- **The phone can't reach the dev server on Wi-Fi:** use `npm run tunnel` or USB. WSL2 and many office networks block it.
- **`npm install` asks for a login or uses a private registry:** check that `.npmrc` is still there (`registry=https://registry.npmjs.org/`).
- **The cloud stopped answering after a quiet week:** the free Supabase project paused; resume it from its dashboard.
