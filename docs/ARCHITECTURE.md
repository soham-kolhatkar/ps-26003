# Architecture

## Stack
Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler) · TypeScript 6 strict · expo-router (typed routes) · zustand · i18next · expo-speech · expo-sqlite (F01) · expo-notifications (F06) · Firebase JS SDK (F15).

## Layers
```
src/app/            Routes (expo-router). Thin: compose components, call stores/repos.
  _layout.tsx       Root providers (SafeArea, i18n init, StatusBar)
  index.tsx         Welcome / language (F00) → role picker (F01)
  (patient)/ (caregiver)/ (asha)/ (doctor)/    Role groups (F01+)
src/components/     Shared elder-friendly UI primitives
src/theme/          Design tokens (colors, type scale, spacing, touch sizes)
src/i18n/           i18next init + LANGUAGES registry + packs/*.json
src/store/          zustand stores (settings; session/role from F01)
src/services/       Device services: tts (F00), notifications (F06), photos (F05), sync (F15)
src/db/             (F01) schema, migrations (PRAGMA user_version), typed repos, demo seed
src/engine/         (F02+) pure, unit-tested logic: difficulty, scoring, trends
src/games/          (F02+) GameShell + one folder per game + registry
```

## Data flow
UI → store/repo → SQLite (sync, local). Engines are pure functions over session rows. The sync service (F15) reads the outbox and pushes to Firestore. The patient flow never awaits the network.

## Data model (planned, F01)
`household`, `patient`, `user` (caregiver/asha/doctor + pin_hash), `patient_user`, `game_session`, `game_level`, `reminder`, `reminder_event`, `photo`, `alert`, `sync_outbox`, `setting`.
