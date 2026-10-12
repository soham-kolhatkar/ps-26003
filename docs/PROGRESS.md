# Progress

**Current feature:** F00 Foundation (`feat/f00-foundation`). Implemented and waiting for user test.
**Next:** F01 Data layer + roles.

## Tier 1: core demo
| ID | Feature | Status | Branch | Merged |
|---|---|---|---|---|
| F00 | Scaffold, theme, i18n EN/HI, TTS, docs, jest, lint, tunnel | 🧪 testing | feat/f00-foundation | — |
| F01 | SQLite schema/migrations/repos, demo seed, role picker + PIN, role route groups | ⏳ | | |
| F02 | Patient home, GameShell, difficulty engine | ⏳ | | |
| F03 | Game: memory card match | ⏳ | | |
| F04 | Game: daily routine sequencing | ⏳ | | |
| F05 | Game: family photo recall | ⏳ | | |
| F06 | Reminders (local notifications, ack screen, adherence) | ⏳ | | |
| F07 | Caregiver dashboard (charts) | ⏳ | | |
| T1 | Hardening + tag v0.1.0 | ⏳ | | |

## Tier 2: complete platform
| ID | Feature | Status |
|---|---|---|
| F08 | Game: object/pattern recognition | ⏳ |
| F09 | Game: attention/reaction tap | ⏳ |
| F10 | Game: word recall | ⏳ |
| F11 | Trend detection + alerts | ⏳ |
| F12 | ASHA mode | ⏳ |
| F13 | Doctor view | ⏳ |
| F14 | Assamese pack | ⏳ |
| F15 | Firebase sync (needs user's Firebase project) | ⏳ |
| T2 | Tag v0.2.0 | ⏳ |

## Tier 3: polish (to discuss)
Low-resource language (Manipuri/Khasi/Mizo) + recorded audio, PDF report export, polish, EAS APK, demo script.

## Known issues / notes
- `npm install` warns about `always-auth` in the user's global npm config. This is harmless.
- `unrs-resolver` postinstall is not approved under npm 11 `allowScripts`. Lint works without it.
- The language choice is in-memory only until F01 persists it.
