# Architecture

## Stack
Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler) · TypeScript 6 strict · expo-router (typed routes) · zustand · i18next · expo-speech · expo-sqlite (F01) · expo-notifications (F06) · Firebase JS SDK (F15).

## Layers
```
src/app/            Routes (expo-router). Thin: compose components, call stores/repos.
  _layout.tsx       Root providers: SafeArea, SQLiteProvider(onInit: migrate → seed → language → PINs)
  index.tsx         Welcome + language → /roles
  roles.tsx         Role picker: device patient (no PIN) + staff users
  pin/[userId].tsx  PIN pad → signInStaff → /<role>
  patient/ caregiver/ asha/ doctor/   Role folders; _layout = RoleStack guard
  patient/game/[id].tsx               GameShell for a registry game
  caregiver/photos.tsx, photo-new.tsx  Family photo manager (camera/gallery → name + relation)
  caregiver/progress.tsx              Progress dashboard (KPIs, score line, per-game tiles, adherence, recent)
  caregiver/reminders.tsx, reminder-edit.tsx  Reminder list (on/off, test) + editor (type, title, times/date)
  patient/reminder/[eventId].tsx      Full-screen spoken "time for…" prompt (done / later)
src/components/     Shared elder-friendly UI primitives (AppText, BigButton, Card, TopBar, Icon, Picture, StatusLine, PressableScale…); charts/ (LineChart, ColumnChart, Sparkline, StatTile, Meter, ChartCard, geometry)
src/theme/          Design tokens (colors, type scale, spacing, radii, shadows, motion, touch sizes) + fonts (per language)
assets/pictures/    Fluent Emoji 3D PNGs (MIT), written by scripts/fluent-pictures.mjs with components/pictureAssets.ts
src/i18n/           i18next init + LANGUAGES registry + packs/*.json
src/store/          zustand: settings (language, persisted), session (role/user/patient, in-memory)
src/services/       Device services: tts (promise-based), auth (PINs), photos (pick/store/delete files), datetime, notifications (local reminder scheduling, snooze/test), sync (F15)
src/db/             client (setDb/getDb), types (DbClient), migrations (PRAGMA user_version), models,
                    repos/*, seed/demo (DEMO story + resetDemo), useDbQuery hook, testing/nodeDb
src/engine/         (F02+) pure, unit-tested logic: difficulty, scoring, reminders, progress, trends (F11 alerts)
src/games/          types (GameDefinition/GameProps), registry (GAMES list), GameShell (intro→play→done),
                    session.finishSession (save + next level), feedback (praise, haptics, stars),
                    items.ts (shared objects), <game>/ (pure rules file + tested, <Game>.tsx)
                    pacing (afterSpeech/useAlive)
                    games: object-recognition/, memory-match/, routine-sequence/, photo-recall/, odd-one-out/, pattern/, reaction-tap/, word-recall/
```

## Data flow
UI → store/repo → SQLite (sync, local). Engines are pure functions over session rows. The sync service (F15) reads the outbox and pushes to Firestore. The patient flow never awaits the network.

## Data model
Schema v1 (F01): `setting(key,value)`, `household`, `patient` (→household), `app_user` (role caregiver|asha|doctor), `patient_user` (patient↔staff + relation), `game_session`, `game_level`.
Schema v2 (F05): `photo` (patient, local uri, person_name, relation, added_by).
Schema v3 (F06): `reminder`, `reminder_event`.
Tier 3 (F15): `store/device` (mode demo|cloud + role, in kv), `store/account` (session restore, cached profile), `cloud/` (`client` = supabase-js with kv auth storage, `account` sign-up/in/out, `phone` phone+PIN mapping, `errors`), `services/kv`, `services/confirm`, `services/secureStore`. `db/client.databaseNameFor(mode, uid)`: `smriti.db` (demo), `smriti-cloud-<uid>.db`, `smriti-setup.db`. Routes `setup`, `auth/sign-in`, `auth/sign-up`, `settings`, `pair`. F16: `cloud/people` (RPC wrappers), `sync/people.applyPeople` + `sync/refresh` (queued pull, `useCloudRefresh`), shared `PatientForm` / `JoinWithCode` / `PeopleScreen` mounted as `<role>/patient-new|join|people`, `patient/family` (family corner) + `patient/photos|photo-new` (reuse). Local schema v6: `patient_user.member_role`, `is_manager`. F17: schema v7 (`sync_outbox`, `sync_cursor`, `sync_flag`), `sync/outbox` (SQLite triggers, cloud DBs only), `sync/tables` (per-table mapping + apply), `sync/engine` (push/pull, exclusive), `sync/remote` (Supabase) + `sync/testing/memoryRemote`, `sync/run.syncNow`, `sync/SyncLoop`, `store/sync`, `components/SyncChip`. SQL 003 in `supabase/migrations/`. F18: schema v8 `doctor_note` (+ sync spec), `db/repos/notes`, `components/DoctorNotes`, routes `asha/reminders|reminder-edit` (reuse), `auth/reset-pin`; SQL 004 (`doctor_notes`, `pin_resets`, `create_pin_reset`, `consume_pin_reset`) and the Edge Function `supabase/functions/reset-pin` (deployed by the user from the dashboard editor). F19: `cloud/demoSeed` (+ `cloud/client.isolatedClient`), route `demo-tools`, SQL 005 `delete_patient`. Cloud SQL in `supabase/migrations/`. E2E in `e2e/`.
F13: `engine/report` (GAME_DOMAIN, domainSummaries, gameRows, weeklyIndex, reactionSummary, adherenceOver) → route `doctor/patient`.
Schema v5 (F12): `visit` (patient, user, started/ended, checkup JSON + checkup_score, observations JSON, note, refer, next_visit_at). Engine `engine/visits` (observations, scheduling, CHECKUP_STEPS, scores). `games/CheckupRunner` runs the fixed check-up (incl. `games/orientation`). Routes `asha/patient`, `asha/visit`.
Schema v4 (F11): `alert` (patient, alert_key, kind game_decline|adherence_low|inactive, game_id, severity info|warning|serious, detail JSON, first_seen/updated/seen/resolved). `services/alerts.refreshAlerts` = engine/trends → repos/alerts.syncAlerts. Shown via `components/PatientAlerts` (routes caregiver|asha|doctor/alerts) and `AlertsButton`.
Planned migrations: v4 `alert` (F11), v5 `sync_outbox` (F15).

## Demo story (src/db/seed/demo.ts)
Device patient **Kamala Sharma "Kamala"** (72, Cinnamara, Jorhat). Caregiver daughter **Priya Sharma**. ASHA **Sunita Devi** (Kamala, Lakshmi Iyer, Ramesh Kumar). Doctor **Dr. Anjali Mehta** (all three). PIN 1234.

## Game session flow
Patient home tile → `/patient/game/[id]` → GameShell loads `game_level` → intro (spoken instruction) → game component calls `onTrial` once per round (first try) and `onComplete` → `finishSession`: computeSessionStats → insert `game_session` → `recentOutcomes` → `nextLevel` → upsert `game_level` → celebration (stars, "new level" if up).

Tier 4 (F20, D50/D51): `theme/tokens` v2 (warm ground, tea-green primary, tonal leaf, clay, staff-only status, `shadow`, `motion`), `theme/fonts` (Noto Sans Devanagari for English and Hindi via `useFonts` in the root layout; `AppText` picks family + line height by language). UI icons = `components/Icon` (Phosphor, one deep import per icon, kebab-case names). Content pictures = `components/Picture` (glyph → bundled Fluent PNG via the generated `pictureAssets`, platform emoji as fallback). `TopBar` (Back/Stop left, help right), `StatusLine` (shape + colour + word), `PressableScale` (press feedback through Reanimated, follows reduce-motion). No emoji in UI code: controls get an `Icon`, content gets a `Picture`.

F21: schema v9 `sos_event` (+ insert-only sync spec, SQL 006), `db/repos/sos` (family contacts, record, unseen, mark seen), `services/sos` (`dial` = `tel:` link, `callForHelp` = record + sync now + dial), `components/SosBanner` (caregiver + ASHA homes), `notifySos` after a pull. Routes `patient/call` (family picker) and `patient/games` (all games). `engine/todaysGames` picks the patient home's three games (least recently played before today, daily tie-break). `sync/remote.isMissingTable`: a cloud table that doesn't exist yet is skipped on pull and its changes stay queued on push.

