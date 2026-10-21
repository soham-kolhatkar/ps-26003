# Progress

**Current feature:** F20 design foundation + the user's review fixes (D52), on `feat/f20-design-foundation`: pushed, **waiting for the user's test** ("F20 review fixes" checklist at the end of TESTING.md).
**Next:** F21 patient phone.

## Tier 1: core demo
| ID | Feature | Status | Branch | Merged |
|---|---|---|---|---|
| F00 | Scaffold, theme, i18n EN/HI, TTS, docs, jest, lint, tunnel | ✅ done | feat/f00-foundation | aefaec4 |
| F01 | SQLite schema/migrations/repos, demo seed, role picker + PIN, role route groups | ✅ done | feat/f01-data-roles | a8713b1 |
| F02 | Patient home, GameShell, difficulty engine (+ "Find the object" game as the first real game) | ✅ done | feat/f02-patient-home-gameshell | 6b4aed5 |
| F03 | Game: memory card match | ✅ done | feat/f03-memory-match | d79ea60 |
| F04 | Game: daily routine sequencing (+ speech pacing fix) | ✅ done | feat/f04-routine-sequencing | a5b4282 |
| F05 | Game: family photo recall + caregiver photo manager | ✅ done | feat/f05-family-photos | a7f1f21 |
| F06 | Reminders (local notifications, ack screen, adherence) | ✅ done | feat/f06-reminders | f3ce415 |
| F07 | Caregiver dashboard (charts) | ✅ done | feat/f07-caregiver-dashboard | 5c9891f |
| T1 | Hardening + tag v0.1.0 | ✅ done | chore/t1-hardening | v0.1.0 |

## Tier 2: complete platform
| ID | Feature | Status |
|---|---|---|
| F08 | Games: **Odd one out** 🧺 + **Complete the pattern** 🔁 (separate games, D34) | ✅ done (51c5729) |
| F09 | Game: 🐟 **Catch the fish** (attention / reaction time, go/no-go) | ✅ done (cda05af) |
| F10 | Game: 🧠 **Remember and find** (delayed picture-word recall) | ✅ done (afb8a9e) |
| F11 | Trend detection + alerts (engine/trends, `alert` table v4, caregiver/ASHA/doctor views) | ✅ done (2df3d4e) |
| F12 | ASHA mode: triage list, patient page, 5-min home visit (fixed check-up + observations + referral), `visit` table v5 | ✅ done (16f35a0) |
| F13 | Doctor view: referral-first list, read-only 30-day report (abilities, weekly index, per-game, reaction time, reminders, check-ups), share as text | ✅ done (5bb72d0) |
| T2 | Tag v0.2.0 (F14, F15 moved to Tier 3 by the user) | ✅ done | v0.2.0 |

## Tier 3: multi-device (one phone per role) on Supabase, target v0.3.0
Full plan: [docs/plans/tier3-multi-device.md](plans/tier3-multi-device.md) (sync rules, access rules, risks).
| ID | Feature | Status |
|---|---|---|
| F15 | Cloud foundation: "Who will use this phone?" setup, phone + PIN accounts, settings and sign-out, hidden single-phone demo mode, web build for testing (Chromium), SQL `001` | ✅ done (63ee663) |
| F16 | Patients, people, invite codes and patient-phone pairing (+ family corner for photos on the patient phone), membership pull, SQL `002` | ✅ done (fe03cbb) |
| F17 | Data sync: outbox triggers, push/pull for reminders, doses, games, levels, visits; sync status chip; two-device tests, SQL `003` | ✅ done (f2e057c) |
| F18 | Role extras: ASHA edits reminders, doctor's notes, PIN reset via manager (Edge Function) | ✅ done (d471b47) |
| F19 | Cloud demo story (Demo tools), 4-phone demo script, APK v0.3.0, tag v0.3.0 | ✅ done (9cae723), tagged v0.3.0 |

## Tier 4: UI redesign, target v0.4.0
The user found the UI cluttered and messy (2026-10-21). Full plan and research: [docs/plans/tier4-ui-redesign.md](plans/tier4-ui-redesign.md); visual direction: https://claude.ai/artifact/4uM8m3uXX8ikDJt35m2Wqt
| ID | Feature | Status |
|---|---|---|
| F20 | Design foundation: tokens v2, fonts per language, icons (Phosphor), pictures (Fluent 3D), shared components, motion, haptics | 🧪 testing |
| F21 | Patient phone: setup, pairing, PIN, home (today's 3 games + all games + SOS call family), reminder, family corner | ⏳ |
| F22 | Games: shell, boards, prompts, end-of-game bloom, all 8 games | ⏳ |
| F23 | Family caregiver: home, progress dashboard, reminders, photos, people, settings | ⏳ |
| F24 | ASHA and doctor: triage home, patient page, visit form, report, alerts, notes | ⏳ |
| F25 | Assamese pack (was F14, moved here by the user) | ⏳ |
| F26 | Polish, accessibility pass, APK v0.4.0, tag v0.4.0 | ⏳ |

## Tier 5: later (the old Tier 4, moved by the user on 2026-10-21)
Low-resource language (Manipuri/Khasi/Mizo) + recorded audio · PDF report export · real SMS OTP (MSG91 + DLT) + login lockout · realtime updates · Play Store signing.

## Known issues / notes
- `expo-doctor`'s React Native Directory check sometimes fails (reactnative.directory unreachable from the corporate network, HTTP 000; seen 2026-10-14, passed again later the same day). Retry; it is not a project problem.
- **Testing is in Chromium during Tier 3** (user's choice; the phone is busy). `npm run web` serves the app at http://localhost:8081 (the same server Expo Go uses). `npm run e2e` drives headless Chromium (Playwright, browser in `~/.cache/ms-playwright`, Noto emoji/Devanagari fonts in `~/.local/share/fonts`). Each browser context = one phone. E2E runs create real **test accounts named "E2E …"** in Supabase (Authentication → Users; safe to delete).
- On web, `/` is served without the COOP/COEP headers (other routes have them); expo-sqlite works anyway with the async API. Web is a test bed only, never shipped.
- **Fixed (2026-10-13, see the F16 fix under D45):** Expo Go reloads and language-pack hot updates no longer break the database (fresh native connection + stable init registry). The older note below is kept for history.
- **Expo Go dev only (older note):** after a *full JS reload* (double-R, or editing a language-pack JSON while the app is open), expo-sqlite calls fail with `NativeDatabase.execAsync … NullPointerException` (a red "Render Error" or `DB query failed` toasts). A **cold restart** fixes it: `adb shell am force-stop host.exp.exponent`, then open `exp://localhost:8081` again. Normal Fast Refresh of .tsx files is fine. The APK never reloads JS, so it is unaffected.
- F11: on a phone whose demo history was *backfilled* (F07) after real test games, levels can disagree with the seeded history (real games at level 1, seed at level 3) and Kamala may show a "Daily routines" decline. **Reset demo data** gives the consistent story (Ramesh flagged, Kamala and Lakshmi clear).
- APK v0.1.0 sha256 `a08cf427269f8c3b9a9093f4c05facf05f83cbe014098e18f32fcd9438bf0273` (on the phone in Download/ and in C:\Users\kolhsoh\Downloads).
- APK v0.2.0 sha256 `34ace20bf52c203b7851a41abb6232c5960f0b3517b6aeed95f63600aa57b023`. APK v0.3.0 sha256 `f5991b68632b36cb5ffde62bf8f46f26306ddeb0628cdcb91f876c834bad2eb7` (built from 2d6f3e5, in `dist/`).
- 2026-10-21: the 6 Expo SDK 57 patch updates (`expo` 57.0.28 → 57.0.30, `expo-router`, `expo-notifications`, `expo-constants`, `expo-linking`, `@expo/ui`) were applied in F20 (`npx expo install --fix`); expo-doctor 21/21.
- e2e `f18-extras` used to expect "0/2 today" for the ASHA's new medicine; after 8 am it is "0/1" (doses due before a reminder exists don't count, D49). F20 made the check accept any dose count.
- 2026-10-12: the Expo ngrok tunnel was blocked by the corporate network during F05 testing (TLS to tunnel.*.ngrok.com fails). Still blocked 2026-10-13 → switched to USB (`npm run usb`).
- `npm install` warns about `always-auth` in the user's global npm config. This is harmless.
- `unrs-resolver` postinstall is not approved under npm 11 `allowScripts`. Lint works without it.
- Typed routes (`.expo/types`, gitignored) are generated by the running dev server. If `tsc` reports unknown routes after adding a route file, start `npm run tunnel` once.
- The session (who is signed in) is in-memory by design: every app launch starts at the welcome screen.
