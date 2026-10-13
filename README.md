# Smriti

AI-based cognitive gaming and memory assistance for elderly people with dementia in the North Eastern Region. SIH 2026, PS 26003 (MDoNER · HealthTech).

Offline-first, bilingual (English / हिन्दी, with Assamese next) Android app built with Expo SDK 57.

## What it does (Tier 1, v0.1.0)
- **Patient mode** (no login): big, spoken, errorless UI; a date and time card for orientation; four games with **adaptive difficulty**:
  🃏 Memory pairs · 📋 Daily routines · 👨‍👩‍👧 Who is this? (family photos) · 🔍 Find the object
- **Reminders**: medicine, water, activity, appointments as local notifications (work offline), with a spoken "time for…" prompt and adherence tracking.
- **Caregiver** (PIN): family photo manager, reminder manager, **progress dashboard** (activity score, per-game trends, adherence).
- **Privacy**: all data, including photos, stays on the phone (SQLite). Staff PINs are salted hashes in the OS keystore.

## Run it
```bash
npm install          # uses the public npm registry via .npmrc
npm run usb          # phone over USB (corporate network blocks the tunnel)
npm run tunnel       # or: Expo tunnel, scan the QR with Expo Go (SDK 57)
npm run check        # typecheck + lint + tests + expo-doctor
```
Demo PIN for caregiver / ASHA / doctor: **1234**.

## Docs
[Demo script](docs/DEMO.md) · [Progress](docs/PROGRESS.md) · [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Testing](docs/TESTING.md)
