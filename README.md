# Smriti

AI-based cognitive gaming and memory assistance for elderly people with dementia in the North Eastern Region. SIH 2026, PS 26003 (MDoNER · HealthTech).

Offline-first, bilingual (English / हिन्दी) Android app built with Expo SDK 57. v0.4.0 = Tier 4.

## What it does (Tier 1, v0.1.0)
- **Patient mode** (no login): big, spoken, errorless UI; a date and time card for orientation; four games with **adaptive difficulty**:
  Memory pairs · Daily routines · Who is this? (family photos) · Find the object
  (Tier 2 adds Odd one out · Complete the pattern · Catch the fish · Remember and find)
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
- Four more games: Odd one out · Complete the pattern · Catch the fish (attention / reaction time) · Remember and find (delayed recall)
- **Trend alerts**: each patient compared with their own previous weeks on a level-aware index; low medicine adherence; stopped playing. Shown to family, ASHA and doctor.
- **ASHA mode**: triage list, patient page, a 5-minute home visit with a fixed check-up, observations and referral.
- **Doctor view**: a read-only 30-day report (abilities, weekly trend, per game, reaction time, reminders, check-ups), shared as text.

## Tier 3 (v0.3.0): one phone per person
- **Who will use this phone?** Patient's phone (paired with a code, no login), family caregiver, ASHA worker or doctor (mobile number + 6-digit PIN).
- **Supabase** sync: games, doses, reminders, visits and doctor's notes move between phones; everything still works offline and catches up later. Access rules: each person sees only the patients they were invited to.
- People and codes: invite the ASHA worker, the doctor or family; pair the patient's phone; PIN reset through a family manager.
- Demo tools load the full story into the cloud for the 4-phone demo ([docs/DEMO.md](docs/DEMO.md)).

## Tier 4 (v0.4.0): a calmer redesign
- **Design system** from dementia and older-adult guidelines: warm off-white ground, tea-green primary, big type (22 sp and up), 64 dp touch targets, shadows instead of borders, Noto Sans for English and Hindi.
- **Pictures and icons that look the same on every phone**: Microsoft Fluent Emoji 3D pictures and Phosphor icons (both MIT, bundled). Calm motion that respects the phone's "reduce motion" setting.
- **Patient**: today's 3 games plus all games, the next reminder, and an **SOS** button that opens the dialer to the family and alerts the care team.
- **Games**: errorless hints (a soft green ring, never red), adult praise, no levels or stars on the patient's phone.
- **Family, ASHA, doctor**: plain-words summaries before charts, sectioned patient lists with a count badge, tabs on patient pages, one question per screen in the ASHA home visit.
- The single-phone demo can be left again from "Who is using Smriti?" (**Leave the demo**).

## Docs
[Demo script](docs/DEMO.md) · [Progress](docs/PROGRESS.md) · [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Testing](docs/TESTING.md)
