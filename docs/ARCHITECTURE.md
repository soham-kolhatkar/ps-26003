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
src/components/     Shared elder-friendly UI primitives; charts/ (LineChart, ColumnChart, Sparkline, StatTile, Meter, ChartCard, geometry)
src/theme/          Design tokens (colors, type scale, spacing, touch sizes)
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
Schema v5 (F12): `visit` (patient, user, started/ended, checkup JSON + checkup_score, observations JSON, note, refer, next_visit_at). Engine `engine/visits` (observations, scheduling, CHECKUP_STEPS, scores). `games/CheckupRunner` runs the fixed check-up (incl. `games/orientation`). Routes `asha/patient`, `asha/visit`.
Schema v4 (F11): `alert` (patient, alert_key, kind game_decline|adherence_low|inactive, game_id, severity info|warning|serious, detail JSON, first_seen/updated/seen/resolved). `services/alerts.refreshAlerts` = engine/trends → repos/alerts.syncAlerts. Shown via `components/PatientAlerts` (routes caregiver|asha|doctor/alerts) and `AlertsButton`.
Planned migrations: v4 `alert` (F11), v5 `sync_outbox` (F15).

## Demo story (src/db/seed/demo.ts)
Device patient **Hemoprova Bora "Aita"** (72, Cinnamara, Jorhat). Caregiver daughter **Rimjhim Bora**. ASHA **Pranita Das** (Aita, Lakhi Gogoi, Dhaniram Saikia). Doctor **Dr. Anjali Sharma** (all three). PIN 1234.

## Game session flow
Patient home tile → `/patient/game/[id]` → GameShell loads `game_level` → intro (spoken instruction) → game component calls `onTrial` once per round (first try) and `onComplete` → `finishSession`: computeSessionStats → insert `game_session` → `recentOutcomes` → `nextLevel` → upsert `game_level` → celebration (stars, "new level" if up).
