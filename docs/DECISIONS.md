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
