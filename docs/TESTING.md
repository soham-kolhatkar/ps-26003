# Testing

## One-time phone setup
1. Install **Expo Go** from the Play Store (the current version supports SDK 57).
2. Open Expo Go and **sign in** with an Expo account (create one free at expo.dev). Expo Go requires login to load dev projects.
3. Make sure the phone has a Hindi TTS voice: Settings → System → Languages → Text-to-speech → Google → Install voice data → Hindi (India). Also install English (India).

## Running
- **Over USB (default):** plug in the phone → `npm run usb`. Expo Go opens the app automatically (or Expo Go → Enter URL → `exp://localhost:8081`).
- On the laptop: `npm run tunnel`, then scan the QR with Expo Go (or Expo Go → "Enter URL manually" → the `exp://…exp.direct` URL).
- Shake the phone (or three-finger long-press) for the dev menu → Reload.

## Automated
`npm run check` = TypeScript + ESLint + Jest + expo-doctor.

---

## F00 Foundation checklist
1. The app opens to the Smriti welcome screen with a cream background, a 🌼 logo, the title and a tagline.
2. Tap **हिन्दी**: all text switches to Hindi, and the Hindi button is highlighted.
3. Tap **Read aloud / सुनाएँ**: the phone speaks the greeting in Hindi, slightly slowly. Switch to English, tap again: it speaks in an Indian English voice.
4. Tap Read aloud twice quickly: speech restarts rather than overlapping.
5. The text is large and readable. Try phone Settings → Font size → largest: the layout still fits and scrolls.
6. The **Continue** button is greyed out ("Coming soon"). Expected; F01 wires it up.

---

## F01 Data + roles checklist
> First launch creates the database and the demo story. To start fresh: caregiver → **Reset demo data**.

1. Welcome → pick **हिन्दी** → **Continue**. You see the role picker in Hindi.
2. **Kill the app and reopen it.** The language is still Hindi (it's now saved).
3. The role picker shows 4 cards: **Patient · Kamala** (highlighted, 👵), **Priya Sharma** (Family caregiver), **Sunita Devi** (ASHA worker), **Dr. Anjali Mehta** (Doctor).
4. Tap **Kamala**: you go straight in with no PIN. You see a big "Namaskar, Kamala!" and Read aloud speaks it. Tap the 🔒 "Hold to exit" button once: nothing happens. Hold it for 2 seconds: you return to the role picker.
5. In patient mode, press the Android back button: the app goes to the background and does **not** return to the welcome screen.
6. Tap **Priya** → PIN pad. Enter `1111`: you see "That PIN is not correct" and the dots clear. Enter `1234`: you see the caregiver home with the Kamala card (72 years · Cinnamara, Jorhat · Early stage · Daughter, plus her notes).
7. **Reset demo data** → confirm → "Demo data restored". Everything still shows.
8. **Sign out** → role picker. Tap **Sunita** → 1234 → "Your patients (3)": Kamala, Ramesh Kumar (Middle stage), Lakshmi Iyer.
9. Sign out → **Dr. Anjali** → 1234 → the same 3 patients, with a "reports in Tier 2" note.
10. **Airplane mode on**, kill and reopen the app, and repeat steps 3–6: everything works offline.

---

## F02 Patient home + game framework checklist
1. Roles → **Kamala**. The home shows a greeting for the time of day ("Good morning/afternoon/evening, Kamala!"), a green card with **today's date and the time**, a Read aloud button and **Choose a game** with one tile: 🔍 **Find the object**.
2. **Read aloud** speaks the greeting plus today's date ("…Today is Monday, 12 October. Shall we play a game?"). Try it in Hindi too.
3. Tap the tile → intro: big 🔍, title, instruction spoken automatically, "⭐ Level 1", and the Start button.
4. **Start**. Level 1 shows **2 pictures**, with the target's picture also shown in the prompt. The prompt is spoken ("Find the banana").
5. Tap the **wrong** picture: it dims, the right one glows **orange**, and you hear "Here it is — the banana. Tap it." Tap the right one: it goes green with ✓ and you hear praise, then the next round. (No red, no buzzer: errorless design.)
6. Progress dots fill at the top (6 rounds). After round 6: 🎉 "Well done, Kamala!" with 1–3 stars.
7. **Adaptive difficulty:** play 2 sessions with every answer right the first time. On the 2nd celebration you see 🌟 "Next time: a new level!". Play again: the intro says **Level 2**, and the game shows **3 pictures**.
8. Keep going to **Level 3**: 4 pictures, and the prompt shows only the **name** (no picture).
9. **Level down:** at Level 3, get 4+ of 6 wrong on purpose. Play again: back to Level 2, with no "level down" message shown.
10. Tap **✖ Stop** mid-game: back to home, no crash.
11. Kill and reopen the app: the level is remembered. (Caregiver → Reset demo data resets levels to 1.)
12. Airplane mode: all of the above still works.

---

## F03 Memory pairs checklist
1. Kamala's home now has two tiles: 🃏 **Memory pairs** (first) and 🔍 Find the object.
2. Open Memory pairs → intro spoken → **Start**. Level 1: **4 cards** (2 pairs), shown **face-up** with "👀 Remember the pictures…" (orange banner) for about 4 s, then they turn over (cream with a red border and ✿ motif, like a gamosa) and you hear "Now find the pairs".
3. Tap two cards that match: they stay face-up in **green**, you hear praise, and a progress dot fills (dots = pairs).
4. Tap two that don't match: both show for about 1 s, then turn back. No sound or penalty.
5. Find all pairs → 🎉 celebration with stars.
6. **Memory errors only:** play a session where you deliberately mismatch only cards you haven't seen yet. It still gets 3 stars. Mismatching when you *had* seen the partner lowers the stars.
7. **Help peek:** make 3 "known" mistakes in a row → "💡 Let me show you the cards again" and all cards show for about 2.5 s.
8. **Levels:** 2 perfect sessions → 🌟 new level → Level 2 = **6 cards** (3 columns), Level 3 = 8 cards (4 columns), Level 4 = 12, Level 5 = 16. Cards stay square and fit the screen without scrolling.
9. Hindi: all memory-game text and speech is in Hindi.
10. ✖ Stop mid-game works. Find the object still works as before.

---

## F04 Daily routines checklist
1. Kamala's home has 3 tiles: 🃏 Memory pairs, 📋 **Daily routines**, 🔍 Find the object.
2. Open Daily routines → intro → **Start**. You see a routine header (e.g. ☕ "Making tea"), a row of numbered slots and step cards (emoji + text).
3. **Level 1:** 3 slots, with the **first step already filled** (green). You hear "Making tea. What comes next?". Two cards remain.
4. Tap the **wrong** card: it dims, the right card glows orange, and you hear "Next is: Add tea leaves". Tap the right one: it fills the next slot (green) and is spoken.
5. When one card remains, you first hear the step you just placed **in full**, then the last card drops in and is spoken, then "Making tea is complete! Very good!", and then the 2nd routine starts. **No sentence is cut off.** The progress dots count real choices only.
6. After 2 routines → 🎉 celebration.
7. **Levels:** 2 perfect sessions → Level 2 (3 steps, no anchor, "What do we do first?"), Level 3 = 4 steps … Level 5 = 6 steps (morning / planting / washing clothes). The cards scroll if needed on small phones.
8. Check the routines read naturally in Hindi (text and speech). Tell me about any step whose order feels debatable.
9. ✖ Stop works; the other games still work.

### F04 fix: speech pacing (all games)
- Find the object: the praise ("Wonderful!") is heard in full before the next prompt.
- Memory pairs: the praise after the last pair finishes before the 🎉 screen speaks.

---

## F05 Family photos checklist
> Use real photos of 2–3 people (family, colleagues, or a photo of a photo).

1. Kamala's home: there is **no** "Who is this?" tile yet (no photos).
2. Sign out → Priya (1234). The caregiver home has a **📷 Family photos (0)** button under Kamala's card.
3. Open it: an orange banner reads "Add photos of at least 2 different people…", plus Take photo / Choose from gallery and a 🔒 privacy note.
4. **Take photo**: the camera permission prompt appears the first time → take a photo → square crop → "Who is in this photo?" Type a name (Save stays disabled until you do), pick a relation chip (e.g. Daughter) → **Save photo**. It appears in the grid with name and relation.
5. Add a 2nd person **from the gallery**. The banner turns green: "✅ Who is this? is ready for Kamala (2 people)". Go back: the button shows the count.
6. Optional: add a 2nd photo of the same person with different capitalisation ("rimjhim"). It still counts as 2 people.
7. Sign out → Kamala: the **👨‍👩‍👧 Who is this?** tile now appears. Play: you see a big photo, "Who is this?" (spoken), and name buttons **with the relation** under each.
8. Wrong name → the right one glows orange, "This is Priya." Right name → green, then "Yes! This is Priya, your daughter." heard in full before the next photo.
9. Levels (2 perfect sessions each): L3 drops the relation text; L5 asks "Where is Priya?" and you tap the **photo**. With only 2 people there are always 2 choices; add 4 people to see 4.
10. Caregiver: tap a photo → "Delete this photo?" → Delete. Drop below 2 people and the tile disappears from Kamala's home again.
11. **Reset demo data** removes all photos.
12. Airplane mode: everything works (photos are local).

---

## F06 Reminders checklist
> On first launch after this update the app asks **"Allow Expo Go to send notifications?"** → Allow.

1. **Caregiver home** (Priya): under Kamala's card there is **🔔 Reminders · X/Y today**.
2. Open it: a green summary "Today: X of Y done", then 4 reminders: 💊 Metformin 500 mg (every day 8:30 am, 8:30 pm), 💧 Drink a glass of water (10, 1, 4), 🚶 Evening walk (5:30 pm), 🩺 Check-up with Dr. Anjali Mehta (date 3 days from now, 10:30).
3. **Test in 10 s** on Metformin → lock the phone → within about 10 s a notification appears: "💊 Time for your medicine — Kamala: Metformin 500 mg".
4. **Tap the notification**: the app opens straight to Kamala's full-screen prompt (no PIN), which is read aloud: "Kamala, it is time to take your medicine: Metformin 500 mg." Tap **✅ I took it** → "Thank you, Kamala! Well done." (heard in full) → Kamala's home.
5. Test again → tap the notification → **⏰ Remind me in 10 minutes** → it says it will remind you → a notification comes back about 10 min later.
6. **Patient home:** a due reminder (within 30 min before to 2 h after its time) shows as a **red "🔔 Now" card**. Tap it → same prompt. Below it, one line: "Later · 4:00 pm · Drink a glass of water". When nothing is left: "No more reminders today 🎉".
7. **Add:** ➕ Add reminder → type 💊 → title "Vitamin D" → Add time (native time picker) → Save. It appears in the list. Test it.
8. **Appointment:** type 🩺 → date and time buttons open native pickers → Save. It shows the date and time.
9. **Edit / off / delete:** tap a reminder → change its time → Save. Toggle the switch off: no more alerts (Test is hidden). Delete removes it.
10. Switch the app to **Hindi**, then Test: the notification text is in Hindi ("💊 दवाई का समय").
11. **Airplane mode:** Test still works (notifications are local).
12. Your existing photos are still there (no reset was needed to get the demo reminders).

### F06 fix round 2 (from logs)
- **Cold start from a notification:** Test in 10 s → swipe Expo Go away from Recents → tap the notification. Kamala's prompt opens over her home screen, and ✅ returns to her home. (Previously logged `POP_TO_TOP was not handled`.)
- **Time picker:** Add time / pick a date. Cancel does nothing; choosing adds the time. (The `onChange is deprecated` warning is gone.)

---

## F07 Caregiver dashboard checklist
> Your phone already has 30 days of demo play history (added automatically on update).

1. Priya → under Kamala's card, a green **📊 Progress · N games this week** button. Open it.
2. **Last 7 days** is selected. Four tiles: Games played (+ minutes), Active days "x of 7", Average score (+ "↑/↓/→ … vs previous 7 days" or "No earlier data"), Reminders taken % (taken/decided).
3. **Daily activity score** line: gaps on days without games, a dot and value at the end. **Tap the chart** anywhere: the line above it changes to "12 Oct · score 71 · 3 games" for the nearest day.
4. **▦ Table** turns the chart into a Day/Score table (newest first). **📈 Chart** switches back.
5. **By game**: one tile per game with average score, a trend word ("↑ Improving" green / "↓ Lower than before" amber / "→ Steady"), number of games and level, and a small line of the last 12 sessions.
6. **Reminders taken per day**: thin columns, tap one for "3 of 4 taken". Below: Medicine / Water / Activity meters with % and counts. The table view works here too.
7. **Recent activity**: latest games (score) and reminders (done / missed), with date and time.
8. **Last 30 days**: everything recalculates. The score comparison says "No earlier data to compare" (the history is only 30 days long).
9. Play a game as Kamala, come back: games played, today's score and Recent activity update.
10. Hindi: all labels, dates (e.g. "13 अक्टू") and the disclaimer at the bottom are in Hindi.

---

## T1 Hardening: final pass before v0.1.0 (≈15 min, follow docs/DEMO.md)
1. **Chart crash fix:** Progress → Last 30 days → tap an early column (mid-September) → switch to **Last 7 days**. No crash. (Previously: `Cannot read property 'decided' of undefined`.)
2. **Full demo story in airplane mode**, steps 1–13 of [DEMO.md](DEMO.md), **in Hindi**. Watch for text that is cut off or overflows, and wording that sounds unnatural.
3. Repeat the patient part in **English**.
4. Reminder editor: "Date" and "Time" labels now appear above the appointment buttons.
5. ASHA and doctor screens: the placeholder notes no longer mention "Tier 2".

---

## v0.1.0 APK checklist
> The APK is a separate app ("Smriti", flower icon) with its **own data**, so photos added in Expo Go are not there. It runs without the laptop.
1. Install: `C:\Users\kolhsoh\Downloads\Smriti-v0.1.0.apk` (copy it to the phone, or let me install it over USB). Allow "install unknown apps" if Android asks.
2. Launcher shows the **Smriti flower icon**; the splash screen shows the flower on cream.
3. First launch asks for notification permission → Allow. Then Settings → Apps → Smriti → **Alarms & reminders** should be allowed.
4. Unplug from the laptop and turn on **airplane mode**: the full demo story works (DEMO.md).
5. Reminders → Test in 10 s → the notification shows with the **flower icon** in the status bar and plays sound/vibration (the dedicated "Reminders" channel). Long-press the notification → the channel is named "Reminders".
6. Wait for a real reminder time (e.g. add one 2 minutes ahead): it arrives on time with the phone locked.

---

# Tier 2

## F08 Odd one out + Complete the pattern checklist
> Two new tiles at the bottom of Kamala's home: **🧺 Odd one out** and **🔁 Complete the pattern**. Both start at level 1. "Find the object" also uses the new pictures now.
1. **Odd one out**: intro reads the instruction → Start. Three pictures with names (e.g. 2 fruits + 1 animal); "Which one is different?" is spoken.
2. Tap the right one: green tick, the card explains *"This one is an animal: the cow. The others are all fruits."* and it is read in full before the next round.
3. Tap a wrong one: it fades, the odd one glows amber, "This one is different — the …". Tap it to continue. No red, no buzzer.
4. 6 rounds → the well-done screen. Play 2–3 more times without mistakes: level 2 has 4 pictures, level 3 has 5. All tiles fit on screen without scrolling.
5. **Complete the pattern**: "banana, cup, banana, cup, banana, empty. What comes next?" is spoken. The row is shown as lines (A B / A B / A ?) with a dashed **?** box, and 2 big choices below.
6. Right answer: the **?** box fills with the picture (green). Wrong answer: it fades, the right one glows amber, "Here it is — the …".
7. 5 rounds → done. Later levels: 3 choices, then 3-picture units (A A B), then 4-picture units, where the gap can be in the middle ("Which picture is missing?").
8. **🔊 Hear again** repeats the row and the question.
9. Caregiver → 📊 Progress: two new game tiles ("Not played in this period" until played, then score and level).
10. Hindi: titles "अलग कौन?" and "क्रम पूरा करें", the explanations ("गाय एक जानवर है। बाकी सब फल हैं।") and all picture names sound natural. Tell me about any word that sounds wrong.

---

## F09 Catch the fish checklist
> New tile on Kamala's home: **🐟 Catch the fish**. It starts at level 1.
1. Intro reads the instruction → Start. "Tap the fish as soon as you see it." is spoken, then **Watch the pond…** shows above a blue-green pond.
2. Level 1: one big spot. After a short, varying wait a big 🐟 appears. Tap it: "✓ Caught it!" (green), a soft vibration, and the next fish comes after a moment.
3. Don't tap: after about 5 s, "The fish swam away. Get ready for the next one." is spoken. There's no red and no buzzer, and the game carries on.
4. Tapping the empty pond before the fish appears does nothing (no penalty).
5. 10 fish → well-done screen with stars. Play again 2–3 times, catching every fish quickly: level 2 has 4 spots and the fish appears in a different one each time.
6. Level 3+: the start says "Tap only the fish. Do not tap the frog, the duck or the leaf." Sometimes a 🐸/🦆/🍃 appears. Leave it alone: "✓ Well done! That was not a fish." If you tap it: "That is not a fish. Tap only the fish."
7. Level 4–5: 6, then 9 spots, and less time. Every spot is still easy to hit.
8. **✖ Stop** halfway → back home, no crash, no speech carrying on.
9. Caregiver → 📊 Progress: a "Catch the fish" tile with score and level once played.
10. Hindi: "मछली पकड़ें", "पकड़ ली!", "मछली तैरकर चली गई…" sound natural.

---

## F10 Remember and find checklist
> New tile on Kamala's home: **🧠 Remember and find**. It starts at level 1 (remember 2 pictures).
1. Intro → Start. "Remember these pictures." Then each picture appears big with its name, and the name is spoken ("Remember: 1 of 2"). Every word is heard in full.
2. A recap shows the whole list together: "Remember: rice, chilli."
3. Break: "Now a short break. Tap all the stars." Tap each ⭐; they disappear.
4. "Which pictures did you see? Find 2." A grid of pictures shows "Found 0 of 2". Tap a right one: green, "✓ name", "Yes, the …!". The progress dots fill.
5. Tap a wrong one: it fades, "That one was not in the list." After 2 wrong taps a remaining picture glows amber and is named. Tap it to finish.
6. All found → "You found them all!" → a second list (different pictures) → well-done screen.
7. Play again with no mistakes, 2–3 times: lists grow to 3, 4 and 5 pictures, with more pictures to choose from and more stars. At level 4–5 (9–11 pictures) the grid still fits on screen without scrolling.
8. **🔊 Hear again** in the recall step repeats the question. **✖ Stop** at any step → home, with no speech carrying on.
9. Caregiver → 📊 Progress: a "Remember and find" tile.
10. Hindi: "याद करें और ढूँढें", "इन चित्रों को याद रखें।", "अब थोड़ा आराम। सारे तारे छुएँ।", "आपने सब ढूँढ लिए!" sound natural.

## F11 Trend alerts checklist
> **Fix round 1:** the caregiver home was blank (two alert refreshes collided). Open Priya first and check that her home loads.
> **First: Priya → ♻️ Reset demo data.** Your phone's older demo history mixes with your test games, so it shows a decline for Kamala that the clean demo story doesn't have. The reset also deletes the family photos you added.
1. Sign out → **Sunita (ASHA)** → 1234. **Ramesh is listed first**, with a 🔴 "Things to look at: 3 (3 new)" button. Kamala and Lakshmi show "✅ No concerns in the trends".
2. Open it: **Please review soon · Lower results in "Find the object"** and **"Daily routines"** (≈45% lower, usual level 2 → 1, numbers of games), and **🟠 Needs attention · Medicines often missed** (3 of 6 doses, 50%). Each has a 💡 tip and "Noticed <date>". At the bottom: "How Smriti notices these" and the "not a diagnosis" note.
3. Back: the button now says "Things to look at: 3" (no longer "new").
4. Sign out → **Dr. Anjali** → the same list order and badges.
5. Priya (caregiver): Kamala's card shows no alert button. 📊 Progress has no alert cards at the top.
6. Optional, to see one appear: play **Daily routines** as Kamala 3 times on purpose badly (tap wrong steps first). Priya's home may then show "Things to look at" and the dashboard shows the alert cards. It clears by itself once results recover.
7. Hindi: "ध्यान देने वाली बातें", "जल्द देखें", "दवाइयाँ अक्सर छूट रही हैं" and the explanations read naturally.

## F12 ASHA mode checklist
> Start with **Priya → ♻️ Reset demo data**, so the past visits are the clean demo ones.
1. **Sunita (ASHA)** → 1234. List order: **Ramesh** first, with "🏠 Visit overdue by 2 days" (amber) and the 🔴 alerts button. Then Kamala ("Next visit in 4 days · <date>", "✅ No concerns") and Lakshmi (in 9 days).
2. Tap **Ramesh's card** → his page: notes, overdue line, **🏠 Start home visit**, alerts button, **Check-up score 63, "↓ 14 since last visit"**, a falling sparkline, "Games this week". **Past visits (3)**, each with date, score, amber chips (Sleep: Poor, Mood: Low / sad, Medicines: Sometimes) and the note.
3. **Start home visit** → intro ("about 5 minutes…", hand over the phone) → **Start check-up**.
4. Task 1 of 3 **Today's date**: the instruction is spoken → Start → "Which day is it today?" with 3 big answers, then month, then year. A wrong answer shows the right one ("The answer is …").
5. Task 2 **Remember and find**: one list of 3 pictures → stars → find them. Task 3 **Catch the fish**: 6 fish, 4 spots.
6. The form shows "Check-up score N" with each task's result. Answer the 6 questions (worrying answers turn amber), write a note, tick **Refer to the doctor**. Next visit: "Suggested: in 7 days" is preselected.
7. **Save visit** → "Visit saved", score with "↑/↓ N since last visit", next visit date, "Referred to the doctor" → **Back to patient**: the new visit is at the top, and the status line now says "Next visit in 7 days".
8. Try once with **Skip** on a task: the score shows "(partial)" and is **not** compared with earlier check-ups (no ↑/↓ line, and the tile keeps the last full score).
9. **✖/Back** during the intro leaves without saving anything.
10. Hindi: "घर का दौरा शुरू करें", "आज कौन-सा दिन है?" (the weekday and month names in Hindi), the observation questions and "दौरे में 2 दिन की देरी" read naturally.
> Dev note: if you edit while Expo Go is open and see red "NativeDatabase … NullPointerException" errors, cold-restart Expo Go (see Known issues in PROGRESS.md).

## F13 Doctor view checklist
> Start with **Priya → ♻️ Reset demo data**: the seeded Ramesh visit now includes a referral to the doctor.
1. **Dr. Anjali** → 1234. **Ramesh** is first, with "🩺 Referred by the ASHA worker on <date>" (amber) and the 🔴 alerts button. The other patients follow. The footer explains the order.
2. Tap **Ramesh** → **Cognitive trend report**: patient card, "Last 30 days · <from> – <to>", an amber **Referred by Sunita Devi on <date>** box with "Sleep: Poor", "Mood: Low / sad", "Medicines: Sometimes" and her note.
3. Alert cards (Find the object, Daily routines, Medicines often missed).
4. **Abilities**: tiles for "Planning & reasoning" and "Recognition & meaning" with an index and "↓ N points", with the games named under each.
5. **Performance index by week**: a line falling in recent weeks. Tap it to see "Week from <date> · index N · N games". **▦ Table** shows the weeks as rows.
6. **By game (30 days)**: rows with games played, level and change.
7. **Reminders taken (30 days)**: Medicine ≈ 36–50% with counts. **ASHA check-ups**: 63, 77, 100 with dates.
8. **📤 Share summary (text)** → the Android share sheet (WhatsApp, Messages, Gmail…). The message lists the patient, period, abilities, medicines, last check-up, referral, alerts and the disclaimer. (Send it to yourself to check.)
9. Open **Kamala**'s report: no referral and no alerts. Abilities show Memory etc. (or "Too few games to compare").
10. Hindi: "संज्ञानात्मक रुझान रिपोर्ट", ability names, the table headers and the shared text are in Hindi.

---

# Tier 3 (tested in Chromium)
> How: with the dev server running (`npm run web`), open **http://localhost:8081** in Chrome or Edge on Windows. Use a separate **profile or InPrivate/Incognito window per "phone"**, because each window keeps its own data. Make the window phone-sized (F12 → device toolbar, or just narrow it). I run the same flows automatically with `npm run e2e`.

## F15 Cloud accounts checklist
1. New window → Welcome → **Continue** → **"Who will use this phone?"** with 4 cards (Patient's phone, Family caregiver, ASHA worker, Doctor). There is no role picker any more.
2. **Family caregiver** → Sign in screen ("This phone is set up for: Family caregiver") → **New here? Create an account** → name, mobile number (10 digits), district, 6-digit PIN twice → **Create account** → your caregiver home: "Hello, <name>", ⚙️ Settings, and "No family member added yet…" (adding one is F16).
3. Reload the page at `http://localhost:8081/` (= an app restart): it opens straight into your home, still signed in.
4. ⚙️ **Settings**: your name, role, district and number, and the language buttons (switch to हिन्दी and back) → **Sign out** → confirm → back to the start.
5. Sign in again: a wrong PIN shows "Wrong mobile number or PIN". The right PIN works, even typed as "+91 98765 43210".
6. New window → **ASHA worker** → sign in with the *caregiver's* number → "This number is registered as Family caregiver, but this phone is set up for ASHA worker…". Create an ASHA account instead: there is a "Sub-centre / PHC" field.
7. Doctor: same, with a "Hospital or clinic" field.
8. **Patient's phone** → "Pairing this phone with a family code arrives in the next update" → Change this phone's role.
9. **Hidden demo:** on "Who will use this phone?", press and hold the 🌼 for 2 seconds → "Demo on one phone?" → Open demo → today's role picker, with Kamala and the full offline demo as before.
10. Supabase dashboard → **Authentication → Users**: your accounts appear as `p91XXXXXXXXXX@phone.smriti.app`. **Table Editor → profiles**: name, role, phone, district.

## F16 People, codes and pairing checklist
> Use 3–4 separate windows (one per "phone"). Accounts from F15 can be reused.
1. **Caregiver window** → home → **➕ Add your family member** → full name, "What the family calls them" (e.g. Kamala), age, gender, language, stage, **You are their… Daughter**, village → **Save** → the patient card appears, with Progress, Reminders and **👥 People**, and a note that family photos are added on the patient's own phone.
2. **👥 People** → you are listed as "Daughter · ⭐ manager". "Kamala's phone is not paired yet" (amber).
3. **Invite the ASHA worker** → a big 6-digit code, "Valid for 7 days, for one person", **Send the code** (share sheet) → Done.
4. **ASHA window** → sign up as ASHA → **🔑 Join with a code** → try `000001`: "That code is not valid or has expired" → the real code → the patient appears in her list. Her People screen shows everyone, but "Only the family … can invite people".
5. **Caregiver → People → Pair Kamala's phone** → a code "Valid until <time>" (15 minutes).
6. **Patient window** → Continue → **Patient's phone** → type the code → **Pair this phone** → choose a 4-digit family PIN, twice → **Kamala's home** (greeting, date, games). Reload at `/`: it opens straight into Kamala's home.
7. On the patient window: **Hold for the family corner** (bottom, 2 seconds) → PIN → **Family corner**: Family photos, Unpair this phone.
8. Caregiver → People: "Kamala's phone is paired" (green).
9. **Invite the doctor** → **Doctor window** → sign up as doctor → Join with a code → the patient appears. Caregiver → People → **Remove** the doctor → the doctor's list (reload at `/`) shows "No patients linked yet".
10. ASHA → patient → People → **Leave** → back to her list, without the patient.
11. Optional: ASHA **➕ Register a patient** (a family without a smartphone): she becomes the manager and can pair that patient's phone herself.
12. Hindi: switch language in ⚙️ Settings (staff) and check the People and code screens.

## F17 Data sync checklist
> Two windows are enough: one **caregiver**, one **patient's phone**, paired as in F16 (you can reuse that pair). The sync chip on the caregiver's home shows what is happening; tap it to sync at once.
1. Caregiver → **Reminders** → **Add reminder** → Water (or Medicine) → **Add time** (in the browser a box asks for HH:MM: type the current time) → **Save**. The chip shows "⏳ 1 change waiting", then "✓ Synced just now" within a few seconds.
2. Patient window → reload at `/`: the reminder is on Kamala's home as **Now** within about 30 seconds (reload again if needed).
3. Patient: tap the reminder → **I drank it** / **I took it** → back home.
4. Caregiver → home: **Reminders · 1/N today** within about 30 seconds (or tap the chip).
5. Patient: play any game to the end → caregiver: **Progress · 1 games this week**; open **📊 Progress**: the game and today's score are there.
6. Offline: in the caregiver window open DevTools → Network → **Offline**, add another reminder: the chip says "📴 Offline: 1 change saved on this phone". Back **Online**: it syncs and reaches the patient window.
7. Edit the reminder's time on the caregiver → after a sync the patient window shows the new time. **Delete** it → it disappears from the patient window.
8. ASHA (from F16): record a **home visit** for the patient → the caregiver and doctor windows see it (ASHA patient page / doctor report, "Past visits" / "ASHA check-ups").
9. Sign out (⚙️ Settings) right after making a change: no error; signing in again shows the change.
10. Phone (optional, `npm run usb`): the same with Expo Go as the patient's phone, plus a real notification for the reminder.

