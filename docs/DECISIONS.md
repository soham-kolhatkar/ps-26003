# Decisions log

Short records of non-obvious choices. Newest at the bottom.

### D1: Expo SDK 57 + Expo Go for development (2026-10-12)
The latest SDK. No Android SDK or Java on the dev machine, so all testing goes through Expo Go and the tunnel. Only Expo Go-bundled native modules are allowed until we switch to an EAS build (Tier 3).

### D2: SQLite on the device is the source of truth; Firebase is only a sync target
Firestore's offline cache in RN is memory-only with the JS SDK. The demo must work in airplane mode, so all reads and writes go to `expo-sqlite`, and an outbox pushes to Firestore when online (F15).

### D3: Family photos never leave the device
Firebase Storage needs a paid plan for new projects, and keeping photos local is a privacy point we can show judges.

### D4: Device TTS (expo-speech), with pre-recorded clips as a future override
Free and offline for en-IN/hi-IN. Low-resource NER languages (Tier 3) will use recorded clips per pack.

### D5: Custom SVG charts instead of a chart library
Avoids compatibility risk with RN 0.86 / React Compiler. The charts we need are simple (line, bar).

### D6: Adaptive difficulty = weighted staircase targeting 75–80% success
Errorless-learning principle for dementia. Up if accuracy ≥ 85% and reaction time isn't worse over the last 3 sessions; down if < 65%. Explainable to judges in one sentence.

### D7: Language packs as JSON + a `LANGUAGES` registry
Adding a language means adding one file plus one registry entry. A jest parity test keeps all packs in sync.

### D8: Expo tunnel for phone testing
WSL2 runs in NAT mode, so the phone can't reach the dev server by LAN IP. `@expo/ngrok` is a dev dependency, and `npm run tunnel` is the way to run.

### D9: Light theme only
Consistent high contrast for elderly users. `userInterfaceStyle: light`.

### D10: Staff PINs hashed (salted SHA-256) in SecureStore; patients need no PIN
Patients with dementia must never be blocked by a login. Caregiver/ASHA/doctor screens are behind a 4-digit PIN; only `{salt, hash}` is stored, in the OS keystore. Demo PIN 1234 is set on first launch and never overwrites an existing PIN.

### D11: Repos take a `DbClient`; tests run real SQL on node:sqlite
`src/db/types.ts` defines a minimal interface that expo-sqlite's `SQLiteDatabase` satisfies. Jest uses `src/db/testing/nodeDb.ts` (Node 24 built-in SQLite, in-memory), so migrations, seed and queries are exercised in CI, not just on the phone.

### D12: Role areas are plain route folders (`/patient`, `/caregiver`, `/asha`, `/doctor`)
Expo-router groups `(x)` don't add a URL segment, so four `index` routes would collide. Each folder's `_layout` uses `RoleStack`, which redirects to `/roles` unless the session has that role.

### D13: Stable readable ids for demo rows, UUIDv4 for new rows
`p-aita`, `u-rimjhim`, … keep docs, tests and the demo script stable. New rows use `newId()`.

### D14: "Find the object" ships in F02 as the GameShell's first real game
Rather than a throwaway placeholder, F02 ships the basic mode of the Tier 2 object-recognition game. F08 adds odd-one-out and pattern modes. Levels: 2→6 options; levels 1–2 show the picture next to the name (matching), levels 3+ show the name only (recall).

### D15: Sessions are short and errorless
6 trials per session, about 1–2 minutes. A wrong tap highlights the correct answer and the patient taps it to continue. Accuracy = first-try correct / trials. Score = 80% accuracy + 20% speed versus the game's `targetReactionMs`. Every finished session gets ≥1 star; level-downs are never announced to the patient.

### D16: Reality orientation on the patient home
A big date and time card plus a time-of-day greeting ("Good morning, Aita! Today is Monday, 12 October"). This is a standard dementia-care aid, and cheap to provide.

### D17: Time via `nowMs()` (src/engine/clock.ts)
The React Compiler purity lint rejects `Date.now()` in component bodies, even inside handlers. A tiny helper keeps lint clean and makes time fakeable in tests.

### D18: Memory match counts only *memory errors*
A wrong pair counts against accuracy only if the first card's partner had already been revealed during play, i.e. the patient had the information. Exploring an unknown board is never penalised. The preview (all cards face-up at the start) doesn't count as "seen". After 3 memory errors in a row, all cards are shown again for 2.5 s ("Let me show you the cards again"). Levels: 2/3/4/6/8 pairs, with the preview shrinking from 4 s to 3 s.

### D19: Games may report their own progress
`GameProps.onProgress(done, total)` overrides the shell's default dots (trials vs `trialsPerSession`). Memory match reports pairs found and sets `trialsPerSession: 0`.

### D20: Shared item set
`src/games/items.ts` (24 NE-familiar objects plus `items.*` names in packs) is used by object recognition and memory match, so new items benefit every game.

### D21: Routine sequencing uses only causal routines, tap-to-place, and counts real decisions only
Six routines (making tea, morning, cooking rice, market, planting a seed, washing clothes) were chosen so the order is genuinely fixed and never a matter of personal habit. Patients tap the next step instead of dragging (easier for elderly hands). A round uses a contiguous slice of the routine. Level 1 gives the first step as an anchor; the last card is placed automatically. Neither counts as a trial. Levels: 3 (anchored) → 3 → 4 → 5 → 6 steps, 2 routines per session.

### D22: Game speech is awaited, never cut off (user feedback on F04)
`speak()` returns a promise that resolves on done, stopped or error, with a length-based safety timeout so it can never hang. `GameProps.say` returns it. Any automatic step (next round, auto-placed last card, end of game) waits for the sentence to finish (`afterSpeech(speech, minMs)` in `src/games/pacing.ts`) and checks `useAlive()` before touching state. Speech the patient interrupts by tapping is still allowed to be cut.

### D23: Family photos: no seeded photos, only real family as choices, hidden until playable
No stock photos of "family" are shipped. The demo shows the caregiver taking or choosing photos live. Photos are cropped square, copied into the app's document directory (`services/photos.ts`) and referenced by `photo.uri` (migration v2). The game only offers **real people from the patient's photos** as options (never invented names) and is hidden from the patient home until photos of ≥2 different people exist (`GameDefinition.isAvailable`). Levels: 2 names + relation cue → 3 + cue → 3 → 4 → reverse mode ("Where is Rimjhim?", pick the photo). Options are capped by the number of people. Hindi confirmation avoids gendered possessives ("यह रिमझिम हैं — बेटी").

### D24: Games receive `patientId`
Personal-content games load their own data (e.g. photos) through `useDbQuery`, then build rounds once the data is loaded.

### D25: Never pass file uris as route params
Expo Go cache paths contain URL-encoded segments (`ExperienceData/%40anonymous%2F…`), and expo-router decodes params, which breaks the path. The photo preview showed blank (user bug report on F05). Hand-offs of file uris go through a store (`src/store/pendingPhoto.ts`). Images log `onError` to the dev console.

### D26: Reminders are local notifications rebuilt from SQLite
`reminder` (daily `times` or one-off `once_at`) + `reminder_event` (one row per occurrence: pending/taken/skipped, created lazily via `ensureEvents`, UNIQUE per reminder+due). "Missed" is derived: pending more than 2 h after due. "Due" starts 30 min before. Logic is in `src/engine/reminders.ts` (pure, tested in UTC and IST). Notifications are expo-notifications **local** triggers (they work offline and in Expo Go): DAILY per time, DATE for appointments, TIME_INTERVAL for snooze/test. All use the `rem-` id prefix. `syncReminderNotifications` cancels and rebuilds them from the DB at startup (not awaited, so the permission prompt never blocks), after edits, and on language change (texts are rendered at schedule time). Only the **device patient's** reminders alert on this phone.

### D27: Reminder UX
The patient sees a big red "Now" card on the home screen for due items plus one "next" line (no long list). Tapping it, or the notification, opens a full-screen spoken prompt with ✅ "I took it" and ⏰ "Remind me in 10 minutes". Tapping a notification signs the patient in without a PIN and opens that occurrence. Caregivers get a list with on/off, edit, delete, a **"Test in 10 s"** button (for testing and for showing judges), and native Android time/date pickers. Seed: 4 reminders for Aita (Metformin 08:30/20:30, water ×3, evening walk, check-up in 3 days) plus a deterministic 14-day history (~85% taken) for F07 charts. Installs from before v3 get the demo reminders once via `backfillDemoReminders`, so no reset is needed.

### D28: expo-notifications in Expo Go: three workarounds (user-reported crash on F06)
1. **Never import the package root.** `expo-notifications`' index loads `DevicePushTokenAutoRegistration.fx`, which calls `addPushTokenListener`, which **throws** on Android in Expo Go (SDK 53+, push removed). That crashed the root layout (every route then reported "missing default export"). All usage goes through `src/services/notificationsApi.ts`, which deep-imports only the local-notification modules. ESLint `no-restricted-imports` blocks the root import. The bundle was verified to contain no push-registration code.
2. **The custom channel is optional.** In Expo Go, `setNotificationChannelAsync` fails natively (`NotificationsChannelsProvider` is null). We fall back to the default channel (no `channelId` on triggers). A real build (EAS APK, Tier 3) gets the MAX-importance "Reminders" channel.
3. **The demo-reminder backfill is flag-based** (`setting.demo_reminders_seeded`), not schema-version based. The upgrade to v3 happened on the launch that crashed, so the version check never saw "v2". This also prevents re-adding demo reminders after a caregiver deletes them all.
In dev, `syncReminderNotifications` logs "Reminder notifications scheduled: N (…)". Verify with `adb shell dumpsys alarm | grep host.exp.exponent`.

### D29: Dashboard built with the dataviz method (validated, measured, looked at)
Forms: a KPI row of stat tiles; a **single-series line** for the daily activity score (no legend, end value labelled, gaps left as gaps, ~10% wash); per-game **stat tiles** with a trend word + arrow (never colour alone) and a 12-session sparkline (de-emphasised history, accent on the latest); **single-series columns** (≤24 px, 4 px rounded data-end) for reminder adherence; same-hue **meters** by reminder type. One period filter (7/30 days) above everything. Every chart has a **table view**; tapping snaps to the nearest day and shows a readout (no gating). The chart series colour is `chart.series` `#13805A`: the brand green `#1E6B52` failed the validator's chroma floor (reads as gray), so it stays for UI and text only. Charts are custom react-native-svg (D5) with pure geometry helpers (tested). Verified on the phone by screenshots via adb.

### D30: Trends need enough data on both sides
"vs previous period" and per-game trends require ≥3 completed sessions in **each** window (`MIN_SESSIONS_FOR_TREND`), otherwise "No earlier data to compare". This was caught on-device: the 30-day view claimed "↓10" against 1–2 old sessions. A move under 3 score points is "steady".

### D31: Simulated demo history uses the real engines
`seedGameHistory` simulates 30 days of play per patient/game (ability, drift, play rate) through `computeSessionStats` and `nextLevel`, so levels evolve exactly as they would in use. Aita: steady/improving. Dhaniram: gradual decline (for F11–F13). Existing installs get it once via the `demo_games_seeded` flag. Existing levels are never overwritten.

### D32: Standalone APK built locally (no Expo account)
User choice (2026-10-13): build on this machine rather than EAS. A user-space toolchain, no admin: Temurin JDK 17 in `~/opt/jdk-17` (SHA-256 verified), Android SDK in `~/Android/Sdk` (platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1, per RN 0.86's `libs.versions.toml`). `npm run build:apk` = `expo prebuild --clean` (android/ stays generated and gitignored) + `gradlew assembleRelease` for `arm64-v8a,armeabi-v7a` only → `dist/Smriti-v<version>.apk`, copied to the Windows Downloads folder; `--install` installs it over USB. It is signed with the template's debug keystore (fine for sideloading and demos, **not** for the Play Store). Package `com.smriti.sih26003`, version 0.1.0 (versionCode 1). Permissions added: `SCHEDULE_EXACT_ALARM` + `USE_EXACT_ALARM`, otherwise Android falls back to inexact alarms and medicine reminders can be late. In the standalone app the dedicated MAX-importance "Reminders" channel works (Expo Go couldn't create it, D28).

### D33: Brand icon generated from code
`assets/source/render-icons.mjs` draws the icon set as SVG (yellow 8-petal flower on a tea-green disc, cream background) and renders: full icon, adaptive foreground/background inside the 66% safe zone, an alpha-only monochrome silhouette (Android 13 themed icons), splash, 96 px notification icon, favicon. To change it, edit the script and re-render.

### D34: Odd-one-out and pattern are separate games, not modes of "Find the object"
F08 was planned as extra *modes* of object recognition. They exercise different abilities (name → picture recognition; semantic categorisation; sequence reasoning), so they are separate games (`odd_one_out`, `pattern`), each with its own difficulty staircase and its own trend on the dashboard. Mixing them in one game would mix their success rates in one level. Cost: more tiles on the patient home (6). Shared `items.ts` gained a `category` for unambiguous items only (fish, rice, tea… have none: fish is both an animal and food). Odd one out: levels 1–3 use far groups (fruit vs animal) with 3–5 pictures, levels 4–5 related groups (fruit vs vegetable, animal vs bird). After solving, it says why ("This one is a bird: the duck. The others are all animals."). Pattern: units AB → ABC/AAB/ABB → AABB/ABAC with the gap anywhere after the first full unit; the row is shown one unit per line so the rule lines up vertically, and is read aloud. Pictures in one pattern round come from different categories, so there are no look-alikes (orange/lemon). Neither game has seeded demo history (the dashboard shows "Not played in this period" until they are played).
