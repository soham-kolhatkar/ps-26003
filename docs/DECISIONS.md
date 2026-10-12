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
