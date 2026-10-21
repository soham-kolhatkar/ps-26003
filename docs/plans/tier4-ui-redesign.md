# Tier 4: UI redesign (target v0.4.0)

Status: **approved** by the user on 2026-10-21 (choices below).
Visual direction (canvas with mock screens and today's screens side by side): https://claude.ai/artifact/4uM8m3uXX8ikDJt35m2Wqt

## Why
The user finds the v0.3.0 UI cluttered and messy. An audit of 38 screenshots (web build, 412×915) found:
1. Emoji everywhere: about 45 distinct button emoji plus about 100 game pictures. They are multi-coloured, differ per phone brand and compete with the text.
2. Everything is a bordered box with the same weight (outlined buttons, cards, tinted boxes, chips, left-border alerts). Bold is used almost everywhere. There is no hierarchy.
3. Too much text per card (title + details + chips + description + status line). Alerts are long sentences.
4. The patient home is a long scroll (date card, reminder, Read aloud, 8 list tiles), against "one action per screen".
5. Games: small pictures, an empty bottom half, progress dots that wrap onto two lines, busy memory-card backs.
6. A centred "⬅️ Back" row on every screen; Sign out and Reset demo data on staff home screens.

## What the research says (sources in the research notes below)
- **Layout:** five choices or fewer per screen, the main one much bigger; nothing important below the fold; no hidden gestures; controls and help in the same place on every screen (W3C COGA 4.6.3, 4.3.4; WCAG 3.2.3, 3.2.6).
- **Pictures:** photos or realistic pictures over cartoons; nothing childish; every icon has a visible label; picture + word beats either alone (Alzheimer's Society, AbilityNet, NN/g, Joddrell & Astell 2016, Microsoft Research India).
- **Colour:** contrast matters more than hue (aim for 7:1 text); never colour alone; avoid blue for key controls; plain backgrounds behind text. Status for health workers = colour + shape + word, red only for "do today" (Medic/CHT 2025 co-design).
- **Type:** sans-serif, line height ≥ 1.5 (Devanagari needs it), sentence case, bold only for emphasis, left-aligned.
- **Feedback:** errorless, adult and specific praise (elderspeak raises resistance to care), no timers, no error buzz, speech always paired with text. Motion 100–400 ms, nothing flashes, honour "Remove animations".
- **Touch:** older adults do best with 16–20 mm targets (about 100–125 dp) for primary actions; ours are 64 dp.
- **Staff screens:** summary sentence first, sections by urgency, one measure per chart, bar charts over line charts, detail one tap away.
- **Culture:** red is auspicious in India and white can mean mourning; saffron is religious and political, so never use it as the brand colour. The gamosa is sacred and specific to Assam. Naga and Mizo textile patterns are off-limits. Keep religious objects out of the game items (the `lamp` item is a diya).

## Design system (F20)
| Token | Value | Use |
|---|---|---|
| ground | `#F8F4ED` | screen background (warm off-white) |
| surface | `#FFFFFF` | cards and tiles, soft shadow, no border |
| sunken | `#EFE9DF` | segmented controls, icon buttons, dividers |
| ink / inkSoft | `#1C211E` (14.9:1) / `#4B524D` (7.3:1) | text |
| primary | `#1A5E45` tea green (white text 7.7:1) | the one main action |
| primarySoft / onPrimarySoft | `#DDEEE6` / `#134A36` (8.5:1) | second actions (tonal buttons, no outlines) |
| clay / onClay | `#FBE6DA` / `#7E3412` (7.3:1) | reminders |
| game tints | lilac `#F1E7F3`, sun `#FBF0D9`, pond `#E1F0F1`, leaf `#E6EFE0`, clay | behind pictures only |
| status (staff only) | urgent `#B3261E` ▲, soon `#8A5300` ●, well `#2E6B34` ✓ on soft tints | always with a shape and a word |
| chart | series `#13805A`, de-emphasis `#B9B1A4` (unchanged) | |

- **Type:** Noto Sans, Devanagari build, for English and Hindi (D51: Atkinson Hyperlegible's slashed zero was dropped after the first screens), Noto Sans Bengali for Assamese. Loaded with `useFonts` (works in Expo Go and on web), one family per weight (Regular, SemiBold, Bold), chosen in `AppText` by language. Patient scale 22/24/28/32/40, staff 15/17/20/26. Line height 1.5 (1.3 for Latin headings).
- **Icons:** `phosphor-react-native` (MIT), one deep import per icon, through one `<Icon name>` wrapper. Fill weight on patient screens, regular on staff screens. Always with a text label.
- **Pictures:** Microsoft Fluent Emoji (MIT), bundled PNGs through `expo-image`, behind one `<Picture id>` component that replaces every emoji in items, routine steps, reminder types, roles and avatars. Custom SVGs where Fluent has nothing (family, pressure cooker). MIT notice on an About screen.
- **Components:** `Button` (primary / tonal / plain; 72 dp, 96 dp for the patient's main action), `TopBar` (Back or Stop on the left, Read aloud on the right), `Card` (no border), `ListRow` (icon bubble + title + one line + chevron), `StatusBadge`, `Section`, `Highlight` (summary sentence), `ProgressBar`.
- **Motion:** Reanimated 4 (already installed). Press 120 ms scale 0.97; cards fade in and rise 12 px in 350 ms (at most 5, staggered); screens fade in 300 ms; end of a game = one 2 s bloom. A `motion` store follows `AccessibilityInfo` reduce-motion live.
- **Feedback:** `expo-haptics` Confirm on a correct answer (never Error or Heavy). Optional soft chime with `expo-audio` and a CC0 sound, played before speech, with a "Sounds" switch in settings.

## Screen patterns
- **Patient home (no scroll):** time of day in words with a sun or moon picture ("Wednesday morning"), date and time; the next reminder in a clay card; **Today's games** (3 big tiles, picked by the engine for variety) + **All 8 games**; the family corner hold at the bottom. Read aloud top right.
- **Games:** Stop top left, "4 of 7" and a slim progress bar; the prompt as large text with Hear again; the board fills the space (2 columns, tiles about 160 dp, pictures about 104 dp). A correct pick = green fill + tick + "Yes, that's the dog." A wrong pick only dims the tile (errorless). No level stars on the patient's phone (the caregiver sees levels).
- **End of a game:** one picture with a slow bloom, "Well done, Kamala", one specific sentence, Home (main) and Play again (tonal).
- **Reminder:** full screen, a big picture, "Time for your medicine", the name and time, **I took it** (96 dp) and **Later**.
- **Staff homes:** "Hello, Priya" + sync status + Settings (Sign out, Reset demo data and language move there). One summary sentence first. Patients in sections ("Visit soon", "Doing well"), one status line per patient inside its row.
- **Dashboards:** highlight sentences first, 3 numbers, one bar chart per measure, games not played folded into one line.

## Features
| ID | Scope | Done when |
|---|---|---|
| F20 | Design foundation: tokens v2, fonts per language, `Icon`, `Picture` + Fluent assets for all items/steps/reminders/roles, new `Button`/`TopBar`/`Card`/`ListRow`/`StatusBadge`, motion store, haptics. Shared components switch over, so every screen changes at once; a hidden component gallery for review in Chromium. | No emoji left in shared components; contrast test passes; Hindi has no clipped matras on the phone |
| F21 | Patient phone: welcome, setup, pairing, PIN pad, patient home (today's games + all games + SOS "Call family"), reminder screen, family corner | Patient home fits 412×915 without scrolling, in both languages |
| F22 | Games (copy shortened as each screen is redone, ≤ 20 words per sentence, adult praise): GameShell top bar and progress bar, board sizing, prompts, intro, end-of-game bloom, all 8 games' pictures and states, memory card backs, the fish pond | Every game playable start to end on the phone, no wrong-answer red or buzz |
| F23 | Family caregiver: home, progress dashboard, reminders list and edit, photos, people, settings | Summary-first home; dashboard with highlights and bar charts |
| F24 | ASHA and doctor: triage home with sections, patient page, home-visit form (big radio tiles, steppers), doctor list and report, alerts, notes | Status = colour + shape + word everywhere |
| F25 | Assamese pack (was F14): `as.json` for every key, Noto Sans Bengali, Assamese TTS voice if the phone has one (else text only), language picker | Parity test passes; a native speaker has proofread the patient screens |
| F26 | Polish: accessibility pass (contrast, 1.6× font scale, TalkBack labels), e2e selectors updated, before/after screenshots for the pitch, APK v0.4.0, tag `v0.4.0` | `npm run check` + `npm run e2e` green; the user approves on the phone |

One branch per feature as usual (`feat/f20-design-foundation`, …), stop after each one for the user's test.

## The user's choices (2026-10-21)
1. Pictures: **Fluent 3D**.
2. Patient home: **Today's 3 games + All games**.
3. Added to Tier 4: the **Assamese pack** (F25, after the copy is final, needs a native speaker's proofreading) and an **SOS "Call family" button** on the patient home (F21).
4. Culture: **neutral motifs only** (tea leaves, hills, rain; no gamosa border, no textile patterns); the diya game item is swapped for an everyday object.

## Risks
- Fonts must load before the first screen (splash screen kept until `useFonts` resolves); web uses the same files.
- APK size grows by about 3–4 MB for the pictures (about 110 PNGs at 25–45 KB).
- e2e scripts find buttons by text; copy changes need the selectors updated in the same feature.
- Hindi copy is written by Claude; the user should proofread key screens.

## Research notes
Full condensed notes from the four research passes (guidelines, comparable apps, India and health-worker context, Expo implementation) were collected on 2026-10-21. Key sources: W3C COGA (w3.org/TR/coga-usable), WCAG 2.2, NN/g (older adults, touch targets, icons, animation duration, dashboards), Alzheimer's Society "How to design a website for someone affected by dementia" (2024), AbilityNet "Designing for dementia", Joddrell & Astell 2016 (PMC5454556), Medic "Colors, cues and co-creation" (2025), CHT design best practices, Medhi et al. (Microsoft Research India) on text-free UIs, Williams et al. 2009 on elderspeak, Jin et al. 2007 on touch targets for older adults, Microsoft Fluent Emoji (MIT), phosphor-react-native (MIT), Expo SDK 57 docs (Reanimated, fonts, haptics, audio).
