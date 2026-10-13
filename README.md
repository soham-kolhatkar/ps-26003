# Smriti

AI-based cognitive gaming and memory assistance for elderly people with dementia in the North Eastern Region. SIH 2026, PS 26003 (MDoNER · HealthTech).

Offline-first, bilingual (English / हिन्दी) Android app built with Expo SDK 57. v0.2.0 = Tier 2.

## What it does (Tier 1, v0.1.0)
- **Patient mode** (no login): big, spoken, errorless UI; a date and time card for orientation; four games with **adaptive difficulty**:
  🃏 Memory pairs · 📋 Daily routines · 👨‍👩‍👧 Who is this? (family photos) · 🔍 Find the object
  (Tier 2 adds 🧺 Odd one out · 🔁 Complete the pattern · 🐟 Catch the fish · 🧠 Remember and find)
- **Reminders**: medicine, water, activity, appointments as local notifications (work offline), with a spoken "time for…" prompt and adherence tracking.
- **Caregiver** (PIN): family photo manager, reminder manager, **progress dashboard** (activity score, per-game trends, adherence).
- **Privacy**: all data, including photos, stays on the phone (SQLite). Staff PINs are salted hashes in the OS keystore.

## Run it
```bash
npm install          # uses the public npm registry via .npmrc
npm run usb          # phone over USB (corporate network blocks the tunnel)
npm run tunnel       # or: Expo tunnel, scan the QR with Expo Go (SDK 57)
npm run check        # typecheck + lint + tests + expo-doctor
npm run build:apk    # standalone APK -> dist/Smriti-v<version>.apk
```
Demo PIN for caregiver / ASHA / doctor: **1234**.

## Tier 2 (v0.2.0)
- Four more games: 🧺 Odd one out · 🔁 Complete the pattern · 🐟 Catch the fish (attention / reaction time) · 🧠 Remember and find (delayed recall)
- **Trend alerts**: each patient compared with their own previous weeks on a level-aware index; low medicine adherence; stopped playing. Shown to family, ASHA and doctor.
- **ASHA mode**: triage list, patient page, a 5-minute home visit with a fixed check-up, observations and referral.
- **Doctor view**: a read-only 30-day report (abilities, weekly trend, per game, reaction time, reminders, check-ups), shared as text.

## Docs
[Demo script](docs/DEMO.md) · [Progress](docs/PROGRESS.md) · [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Testing](docs/TESTING.md)
