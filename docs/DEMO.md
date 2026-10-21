# Smriti: demo script (SIH 2026)

**Goal:** in about 7 minutes, show four people on four phones looking after one elderly woman with early dementia in Assam: the patient plays and takes her medicine, the family follows, the ASHA worker visits, and the doctor sees the trend. Everything works offline and syncs when there's a signal.

**Plan A** (below) uses 4 Android phones with the Smriti APK and internet. **Plan B** (further down) is the single-phone offline demo, for a venue without internet.

## Plan A: four phones

### The day before

- [ ] Install **Smriti v0.4.0** on all 4 phones (`Download/Smriti-v0.4.0.apk`, "allow unknown apps"). It installs over v0.3.0 and keeps each phone's sign-in.
- [ ] On any phone: **Who will use this phone?** → hold the title for 1.5 s → **Demo tools** → **Load / reset the cloud demo** (about a minute). This rebuilds the story with the last 30 days ending today, so run it again on the morning of the demo.
- [ ] Set up each phone once:
  | Phone              | Choose           | Sign in                                                                                 |
  | ------------------ | ---------------- | --------------------------------------------------------------------------------------- |
  | 1 Kamala (patient) | Patient's phone  | pair with a code from phone 2 (People → Pair Kamala's phone), family PIN of your choice |
  | 2 Priya (daughter) | Family caregiver | 90000 10001 · PIN 123456                                                                |
  | 3 Sunita (ASHA)    | ASHA worker      | 90000 10002 · PIN 123456                                                                |
  | 4 Dr. Anjali       | Doctor           | 90000 10003 · PIN 123456                                                                |
- [ ] On Kamala's phone: hold **Hold for the family corner** → family PIN → **Family photos** → add 2 photos of teammates, so "Who is this?" works. They stay on that phone.
- [ ] Supabase free projects pause after 7 days without use: open the dashboard the day before.

### On the day

- [ ] Phones charged, volume up, **Do Not Disturb off**, Google TTS voices for Hindi and English installed.
- [ ] Mobile data or Wi-Fi on all 4 (a phone hotspot is fine). The sync line on phones 2–4 says "Synced just now" (tap it to sync at once).

### The story (30 s)

> "Meet **Kamala Sharma**, 72, a retired school teacher from Cinnamara, Jorhat, with early-stage dementia. Her daughter **Priya** looks after her, **Sunita** is the village ASHA worker, and **Dr. Anjali** sees her at the district hospital. Each of them has Smriti on their own phone. Kamala's phone only has what she needs: big pictures, a voice, and no passwords. The screens are calm on purpose: a warm background, one thing at a time, and no red anywhere on her phone."

### Walkthrough

| #   | Phone                        | Do                                                                                                                                                                                                               | Say                                                                                                                                                              |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 1 Kamala                     | Point at the greeting ("Good morning, Kamala!") and the date; tap **Read aloud** (top right)                                                                                                                     | Voice-first and errorless: big text, one thing per screen, no logins, no exit by accident.                                                                       |
| 1b  | 1 Kamala → 2 Priya, 3 Sunita | Tap **Call Priya** (top left) → the dialer opens with Priya's number; then show Priya's and Sunita's homes: the urgent banner **"Kamala pressed SOS · time · calling Priya"** → **OK, seen**                     | Help is one tap away, and the whole care team knows within seconds, even if nobody answers the call.                                                             |
| 2   | 1 Kamala                     | **Today's games** shows 3 big tiles (it rotates the ones she played least). Play **Memory pairs** (from **All games** if it isn't one of today's 3)                                                            | The games adapt (AI difficulty): she stays at about 75–80% success and never sees "wrong": a missed card simply turns back, and a soft green ring shows the way. |
| 3   | 2 Priya                      | Home → the sync line says "Synced just now"; **Progress report** opens with a 3-line **Summary** in plain words, then the charts                                                                                 | The family sees play, scores and trends within seconds, from anywhere, and the summary says what matters before any number.                                      |
| 4   | 2 Priya                      | **Reminders** → **Add reminder** → "Metformin" for now → **Save reminder**                                                                                                                                       | Reminders are set by the family…                                                                                                                                 |
| 5   | 1 Kamala                     | The reminder appears on her home as **Now** (or rings) → **I took it**                                                                                                                                           | …and ring on her phone, offline. She confirms with one tap.                                                                                                      |
| 6   | 2 Priya                      | Home → **Reminders** · "1 of … done today"                                                                                                                                                                       | Adherence comes back to the family on its own.                                                                                                                   |
| 7   | 3 Sunita                     | Her list opens with one sentence ("2 people need attention…"), then **Needs attention**: **Ramesh** first, with a count on his picture and "Visit overdue"                                                       | The ASHA worker's phone is a calm triage list for her village. Details are one tap away, not shouting from the list.                                             |
| 8   | 3 Sunita                     | **Ramesh** → tabs **Alerts · Visits · Notes** → **Start home visit** → **Start check-up** (or **Skip check-up**) → 6 questions, one per screen → **Finish the visit** → **Refer to the doctor** → **Save visit** | A 5-minute check-up with fixed tasks, so visits compare over time. One question per screen, so it works in a busy courtyard.                                     |
| 9   | 4 Anjali                     | Her list: **Referred to you** → **Ramesh** → tabs **Summary · Games · Care · Notes**: abilities ↓, weekly trend, check-ups, medicines. **How to read this report** unfolds the method                            | The doctor gets a trend report, not a diagnosis: comparisons with his own earlier weeks.                                                                         |
| 10  | 4 Anjali                     | **Notes** tab → **New note** → **Save note**; then **Share summary (text)**                                                                                                                                      | Advice goes back to the family and the ASHA worker, and the summary can be sent on WhatsApp.                                                                     |
| 11  | 2 Priya / 3 Sunita           | Show the note on Priya's **Progress report** / Sunita's Ramesh page, **Notes** tab                                                                                                                               | One shared record, four views, each person sees only what their role allows.                                                                                     |
| 12  | 1 Kamala                     | Airplane mode on → play a game → airplane mode off                                                                                                                                                               | Offline-first: everything is saved on the phone and syncs when the signal is back.                                                                               |

### Close (30 s)

- Built for NER realities: patchy networks (offline-first), ASHA-led care, family on another phone, Hindi + English (Assamese next).
- Privacy: family photos never leave Kamala's phone; each person only sees patients they were invited to; PINs and codes, no passwords to remember.
- Designed with dementia-care and older-adult guidelines: big type (22 sp and up), 64 dp touch targets, pictures that look the same on every phone, calm motion that respects the phone's "reduce motion" setting, and staff colours that always come with a shape and a word.
- Next (Tier 5): Assamese and NE languages with recorded voices, real SMS OTP, PDF reports.

## Plan B: one phone, offline

Use this if there is no internet. On "Who will use this phone?" hold the flower picture for 1.5 s → **Open demo**: today's single-phone app with all four roles and the demo story, fully offline.

### Plan B checklist

- [ ] Phone charged; volume up; **Do Not Disturb off** (reminder notifications must show).
- [ ] Google TTS voices installed: **Hindi (India)** and **English (India)**.
- [ ] Smriti v0.4.0 APK (or Expo Go with `npm run usb`), language **हिन्दी** or English as you prefer.
- [ ] Caregiver → **Reset demo data** (fresh, predictable story), then add **2 family photos** (e.g. two teammates) so "Who is this?" is ready. Or keep one person back to add live.
- [ ] **Airplane mode ON**: the whole demo runs offline.
- [ ] PIN for every staff role: **1234**.
- [ ] After the demo, to give the phone back its normal start: Hold to exit → **Leave the demo** (bottom of "Who is using Smriti?"). The demo story stays on the phone for next time.

### Plan B story

> "Meet **Kamala Sharma**, 72, a retired tea-garden school teacher from Cinnamara, Jorhat. She has early-stage dementia. Her daughter **Priya** looks after her; **Sunita**, the ASHA worker, visits; **Dr. Anjali** sees her at the district hospital. Specialist memory care is far away and the network is patchy. Smriti puts gentle, culturally familiar brain games and reminders on one ordinary phone, offline, in her language."

### Plan B walkthrough

| #   | Do                                                                                                                                              | Say (talking point)                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Welcome → tap **हिन्दी** → **सुनाएँ**                                                                                                           | Multilingual, voice-first. Everything on the patient side is read aloud, slowly. Assamese comes next.                                                                                                                                   |
| 2   | Continue → tap **Kamala** (no PIN)                                                                                                              | No logins for the patient. Big text, one action per screen. Leaving needs a 2-second hold so she can't leave by accident.                                                                                                               |
| 3   | Point at the greeting and the date, tap **Read aloud**                                                                                          | Reality orientation, a standard dementia-care aid: "Good morning, Kamala! Today is Tuesday, 13 October."                                                                                                                                |
| 3b  | Tap **Call Priya** (top left) → the dialer opens with Priya's number (cancel it); later, at step 7, Priya's home shows **"Kamala pressed SOS"** | SOS: one tap opens a call to the family, and the press reaches the care team's phones as an urgent banner.                                                                                                                              |
| 4   | **Today's games**: 3 big tiles. Play **Memory pairs** (from **All games** if needed), 1 round                                                 | Calm 3D pictures that look the same on every phone. Errorless design: no red crosses, no buzzer; a wrong card simply turns back and a soft green ring shows the way. We only count a mistake when she'd already seen the matching card. |
| 5   | Finish a game: the slow **bloom**, "Well done, Kamala · You finished …" (then explain)                                                          | **AI: adaptive difficulty.** A staircase keeps her at about 75–80% success: up after two strong sessions, down immediately after a rough one. Kamala never sees a level or a score; the family does, on the progress report.            |
| 6   | Play **Daily routines** (making tea)                                                                                                            | Familiar tasks: making tea, cooking rice, planting in the kitchen garden, washing clothes. Sequencing trains everyday function.                                                                                                         |
| 7   | Hold to exit → **Priya** (1234) → **Family photos** → **Take photo** of a judge, name them                                                      | Photos stay on this phone; nothing is uploaded.                                                                                                                                                                                         |
| 8   | Back to Kamala → **Who is this?**                                                                                                               | Recognising family is the most meaningful memory exercise. Only real family names are ever offered as choices.                                                                                                                          |
| 9   | Priya → **Reminders** → Metformin → **Test in 10 s** → lock the phone                                                                           | Medicine, water, activity and appointment reminders as **local** notifications: they work with no internet.                                                                                                                             |
| 10  | Tap the notification → Kamala's spoken prompt → **मैंने ले ली**                                                                                 | Opens straight to her, no PIN. Adherence is recorded automatically.                                                                                                                                                                     |
| 11  | Priya → **Progress report**                                                                                                                     | A plain-words **Summary** first ("Scores are steady. Kamala played on 5 of 7 days."), then scores per game, trends and medicines. Switch any chart to a table.                                                                          |
| 12  | Point at the **disclaimer**                                                                                                                     | We show trends to support the doctor's judgement. We never diagnose.                                                                                                                                                                    |
| 13  | Show airplane mode is still on                                                                                                                  | All of it ran offline. Data lives in SQLite on the phone.                                                                                                                                                                               |

### Plan B close

- **More games** (done): odd one out, complete the pattern, catch the fish (attention/reaction time), remember and find (delayed recall).
- **Trend alerts** (done): Sunita's (ASHA) list puts Ramesh under **Needs attention** with a count on his picture: lower results in 2 games and missed blood-pressure medicine, each explained with its numbers on his **Alerts** tab.
- **ASHA mode** (done): Sunita's list is a triage list (Ramesh first: alerts + visit overdue). His page shows check-ups slipping 100 → 77 → 63 across visits, with sleep and mood worries. **Start home visit** runs a fixed 5-minute check-up (date, remember-and-find, catch the fish) and 6 quick questions, one per screen, with a referral and the next visit date.
- **Doctor view** (done): Dr. Anjali's list puts Ramesh under **Referred to you**. His report (tabs Summary · Games · Care · Notes) shows the abilities (Planning & reasoning ↓, Recognition & meaning ↓), a weekly index chart, a per-game table, medicines 36%, falling ASHA check-ups, and **Share summary** sends it as text over WhatsApp.
- **One phone per person** (done, Tier 3): with internet, family, ASHA worker and doctor follow Kamala from their own phones (Plan A).
- **Next (Tier 5)**: Assamese, then Manipuri / Khasi / Mizo with recorded voices.

## Likely judge questions (both plans)

- **"Is the AI real?"** Yes, and it's explainable: an adaptive difficulty engine and trend detection that compares each patient's last week with their own previous 3 weeks, on a level-aware performance index. These rules are unit-tested; there's no black box. 210 automated tests run on every change, plus browser tests that drive four simulated phones.
- **"Why not cloud-first?"** Connectivity in NER villages. Offline-first, with sync as an add-on.
- **"Privacy?"** Patient data and photos stay on the device. Staff screens are PIN-protected (salted hash in the OS keystore).
- **"Clinical validity?"** Games follow established cognitive-stimulation and errorless-learning principles. We report trends, not diagnoses. Next step: validate with a geriatrician and ASHA workers in Jorhat.
- **"Cost?"** Free tools, runs on an ordinary Android phone; the offline demo needs no server, and sync runs on a free Supabase project.
- **"Why does it look like this?"** The design follows dementia and older-adult guidelines: high contrast on a warm background, big type, one action per screen, no fail states, and colour never the only signal.
