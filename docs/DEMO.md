# Smriti: demo script (SIH 2026 internal round)

**Goal:** in about 6 minutes, show a working, offline, bilingual app that helps an elderly person with early dementia in Assam, and helps the family that cares for her.

## Before the demo (checklist)
- [ ] Phone charged; volume up; **Do Not Disturb off** (reminder notifications must show).
- [ ] Google TTS voices installed: **Hindi (India)** and **English (India)**.
- [ ] App open in Expo Go (`npm run usb`), language **हिन्दी** or English as you prefer.
- [ ] Caregiver → **Reset demo data** (fresh, predictable story), then add **2 family photos** (e.g. two teammates) so "Who is this?" is ready. Or keep one person back to add live.
- [ ] **Airplane mode ON**: the whole demo runs offline.
- [ ] PIN for every staff role: **1234**.

## The story (say this first, about 30 s)
> "Meet **Aita**, Hemoprova Bora, 72, a retired tea-garden school teacher from Cinnamara, Jorhat. She has early-stage dementia. Her daughter **Rimjhim** looks after her; **Pranita**, the ASHA worker, visits; **Dr. Anjali** sees her at the district hospital. Specialist memory care is far away and the network is patchy. Smriti puts gentle, culturally familiar brain games and reminders on one ordinary phone, offline, in her language."

## Walkthrough
| # | Do | Say (talking point) |
|---|---|---|
| 1 | Welcome → tap **हिन्दी** → **सुनाएँ** | Multilingual, voice-first. Everything on the patient side is read aloud, slowly. Assamese comes next. |
| 2 | Continue → tap **Aita** (no PIN) | No logins for the patient. Big text, one action per screen. Exiting needs a 2-second hold so she can't leave by accident. |
| 3 | Point at the **date and time card** and the greeting | Reality orientation, a standard dementia-care aid: "Good morning, Aita. Today is Tuesday, 13 October." |
| 4 | Play **🃏 Memory pairs** (1 round) | Cards look like an Assamese gamosa. Errorless design: no red crosses, no buzzer. We only count a mistake when she'd already seen the matching card. |
| 5 | Show the **🌟 "new level"** moment (or explain) | **AI: adaptive difficulty.** A staircase keeps her at about 75–80% success: up after two strong sessions, down immediately after a rough one, never announced. |
| 6 | Play **📋 Daily routines** (making tea ☕) | Familiar tasks: making tea, cooking rice, planting in the kitchen garden, washing clothes. Sequencing trains everyday function. |
| 7 | Hold-to-exit → **Rimjhim** (1234) → **📷 Family photos** → take a photo of a judge, name them | Photos stay on this phone; nothing is uploaded. |
| 8 | Back to Aita → **👨‍👩‍👧 Who is this?** | Recognising family is the most meaningful memory exercise. Only real family names are ever offered as choices. |
| 9 | Rimjhim → **🔔 Reminders** → Metformin → **Test in 10 s** → lock the phone | Medicine, water, activity and appointment reminders as **local** notifications: they work with no internet. |
| 10 | Tap the notification → Aita's spoken prompt → **✅ मैंने ले ली** | Opens straight to her, no PIN. Adherence is recorded automatically. |
| 11 | Rimjhim → **📊 Progress** | The family sees play, scores per game, trends, and medicine adherence. Tap a chart, or switch to the table. |
| 12 | Point at the **disclaimer** | We show trends to support the doctor's judgement. We never diagnose. |
| 13 | Show airplane mode is still on | All of it ran offline. Data lives in SQLite on the phone. |

## Close (about 30 s): what's next (Tier 2)
- **More games** (done): odd one out, complete the pattern, catch the fish (attention/reaction time), remember and find (delayed recall).
- **Trend alerts** (done): Pranita's (ASHA) list puts Dhaniram first with "Please review soon": lower results in 2 games and missed blood-pressure medicine, each explained with its numbers.
- **ASHA mode**: one phone, many village patients, a 5-minute check-up during home visits.
- **Doctor view**: a read-only cognitive trend report.
- **Assamese**, then Manipuri / Khasi / Mizo with recorded voices.
- **Optional cloud sync** (Firebase) so family members on other phones can follow along.

## Likely judge questions
- **"Is the AI real?"** Yes, and it's explainable: an adaptive difficulty engine and trend detection that compares each patient's last week with their own previous 3 weeks, on a level-aware performance index. These rules are unit-tested; there's no black box. 123 automated tests run on every change.
- **"Why not cloud-first?"** Connectivity in NER villages. Offline-first, with sync as an add-on.
- **"Privacy?"** Patient data and photos stay on the device. Staff screens are PIN-protected (salted hash in the OS keystore).
- **"Clinical validity?"** Games follow established cognitive-stimulation and errorless-learning principles. We report trends, not diagnoses. Next step: validate with a geriatrician and ASHA workers in Jorhat.
- **"Cost?"** Free tools, runs on an ordinary Android phone, no server needed.
