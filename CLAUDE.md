# Smriti — SIH 2026 PS 26003

AI-based cognitive gaming + memory assistance app for elderly dementia patients in North East India (MDoNER, HealthTech). Built tier by tier for the SIH internal round.

**Read first, every session:** `docs/PROGRESS.md` (where we are), then `docs/DECISIONS.md` and `docs/ARCHITECTURE.md` as needed. Expo-specific rules are in `AGENTS.md`.

## Working agreement (from the user, non-negotiable)
- Claude writes all code. The user tests on a real Android phone (Expo Go) and approves.
- **One feature at a time:** branch `feat/fNN-slug` → implement → `npm run check` → update docs → push branch → **STOP** with a test checklist (**appended at the end** of `docs/TESTING.md`). Merge `--no-ff` into `main` only after the user approves. Tag at tier end (`v0.1.0`, `v0.2.0`).
- If stuck on a decision (scope, stack, paid service, culturally sensitive content), **ask the user**. Don't guess.
- Commit messages: conventional (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Environment gotchas
- **npm registry:** the machine's global npm registry is a private corporate feed. The project `.npmrc` pins `https://registry.npmjs.org/`. Never remove it. Lockfile URLs must be `registry.npmjs.org`.
- Add packages with `npx expo install <pkg>` (dev deps: `npx expo install -- --save-dev <pkg>`, or plain `npm i -D` if that misbehaves).
- **Git remote:** SSH over port 443 (`ssh://git@ssh.github.com:443/soham-kolhatkar/ps-26003.git`), because port 22 is blocked. `core.sshCommand` is set in the local git config.
- **WSL2 NAT:** the phone can't reach LAN IPs, so use the tunnel: `npm run tunnel` (uses `@expo/ngrok`).
  The corporate network blocks ngrok's TLS (since 2026-10-12: "session closed" / "remote gone away"). **Use USB instead: `npm run usb`** (`scripts/usb.sh`): portable adb at `C:\Users\kolhsoh\platform-tools\adb.exe` (no admin) → `adb reverse tcp:8081 tcp:8081` → `expo start --localhost` → opens `exp://localhost:8081` in Expo Go on the phone. The phone (Samsung, serial RZCW32417DD) is authorized for USB debugging. If Windows shows an admin/firewall prompt for adb.exe, **cancel** it. From WSL, run adb from a Windows dir (`cd /tmp`) to avoid UNC-path warnings. Other fallbacks: EAS Update via Expo Go (needs `eas login`), Cloudflare tunnel.
- TypeScript 6: global types must be listed in `tsconfig.json` `compilerOptions.types` (currently `["jest", "node"]`).
- Typed routes are generated into `.expo/types` by the dev server. After adding a route, keep the server running (or start it once) before `tsc`.
- Formatting: Prettier (`npm run format`; single quotes, width 120).
- **APK builds:** JDK 17 at `~/opt/jdk-17`, Android SDK at `~/Android/Sdk` (see D32). Bump `expo.version` and `android.versionCode` in app.json for each release. The APK has its own data, separate from Expo Go's.
- Expo SDK **57** (RN 0.86, React 19.2, React Compiler on, typed routes on). Check versioned docs before using any Expo API: https://docs.expo.dev/versions/v57.0.0/

## Commands
```bash
npm run usb         # dev server over USB (default on the corporate network)
npm run tunnel      # dev server via ngrok tunnel (blocked on the corporate network)
npm run check       # tsc + lint + jest + expo-doctor  (must pass before push)
npm run build:apk   # standalone release APK -> dist/ + Windows Downloads (add -- --install to put it on the phone)
npm test            # jest only
npx expo export --platform android --output-dir <scratch>   # bundle smoke test
```

## Product rules
- **Elder-first UI:** text ≥ 22sp on patient screens, touch targets ≥ 64dp (`src/theme/tokens.ts`), one action per screen, no fail states (errorless feedback), everything readable aloud.
- **Offline-first:** the patient flow must never need the network. SQLite on the device is the source of truth; Firebase (Tier 2) is a sync target only.
- **Every user-visible string goes in i18n packs** (`src/i18n/packs/*.json`) for **all** languages; the parity test enforces identical keys.
- Medical wording: "cognitive activity / trend monitoring". Never "diagnosis".
- Family photos stay on the device.

## Layout
- `src/app/`: expo-router routes only (one group per role from F01).
- `src/components/`: shared UI (`AppText`, `BigButton`, `Screen`).
- `src/theme/`: design tokens.
- `src/i18n/`: i18next setup + language packs. Add a language = pack + an entry in `LANGUAGES`.
- `src/services/`: device services (tts, notifications, photos, sync). After changing reminders, call `syncReminderNotifications(db)`.
- `src/store/`: zustand stores.
- `src/db/`: SQLite. Repos take a `DbClient` argument; screens read with `useDbQuery`; stores use `getDb()`. New tables = a new migration in `migrations.ts` (append-only) + add the table to `ALL_TABLES` in `seed/demo.ts`.
- `src/engine/`: pure logic, unit-tested. No React, no DB.
- `src/games/`: **adding a game** = folder `src/games/<name>/` with a pure rules file (`rounds.ts`/`board.ts`; reuse `src/games/items.ts`) (tested with `seededRng`) + `<Name>Game.tsx` implementing `GameProps` (call `onTrial` once per round with the first-try result, `onProgress` if progress isn't one dot per trial, `onComplete` at the end, `say()` for speech — **await it before any automatic transition** (`afterSpeech` / `useAlive` in `src/games/pacing.ts`), errorless feedback) → add a `GameDefinition` to `registry.ts` → add `games.<id>.{title,description,instruction,...}` to every pack.
- Use `nowMs()` from `src/engine/clock.ts`, never `Date.now()`, in components.
- Never pass file uris through route params (they get URL-decoded). Use a store, as `src/store/pendingPhoto.ts` does.
- **Never `import … from 'expo-notifications'`** (the root crashes Expo Go on Android). Use `@/services/notificationsApi`; add any missing export there as a deep import. ESLint enforces this.
- **Check the Metro log after every feature** (`grep -E 'ERROR|WARN'` on the dev server log) and relaunch the app (`adb shell am force-stop host.exp.exponent`, then `am start -d exp://localhost:8081`). Passing tests don't prove the app starts in Expo Go.
- DB tests: add `/** @jest-environment node */` and use `createTestDb()` from `src/db/testing/nodeDb.ts`.
