# Testing

## One-time phone setup
1. Install **Expo Go** from the Play Store (the current version supports SDK 57).
2. Open Expo Go and **sign in** with an Expo account (create one free at expo.dev). Expo Go requires login to load dev projects.
3. Make sure the phone has a Hindi TTS voice: Settings → System → Languages → Text-to-speech → Google → Install voice data → Hindi (India). Also install English (India).

## Running
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
3. The role picker shows 4 cards: **Patient · Aita** (highlighted, 👵), **Rimjhim Bora** (Family caregiver), **Pranita Das** (ASHA worker), **Dr. Anjali Sharma** (Doctor).
4. Tap **Aita**: you go straight in with no PIN. You see a big "Namaskar, Aita!" and Read aloud speaks it. Tap the 🔒 "Hold to exit" button once: nothing happens. Hold it for 2 seconds: you return to the role picker.
5. In patient mode, press the Android back button: the app goes to the background and does **not** return to the welcome screen.
6. Tap **Rimjhim** → PIN pad. Enter `1111`: you see "That PIN is not correct" and the dots clear. Enter `1234`: you see the caregiver home with the Aita card (72 years · Cinnamara, Jorhat · Early stage · Daughter, plus her notes).
7. **Reset demo data** → confirm → "Demo data restored". Everything still shows.
8. **Sign out** → role picker. Tap **Pranita** → 1234 → "Your patients (3)": Aita, Dhaniram Saikia (Middle stage), Lakhi Gogoi.
9. Sign out → **Dr. Anjali** → 1234 → the same 3 patients, with a "reports in Tier 2" note.
10. **Airplane mode on**, kill and reopen the app, and repeat steps 3–6: everything works offline.

---

## F02 Patient home + game framework checklist
1. Roles → **Aita**. The home shows a greeting for the time of day ("Good morning/afternoon/evening, Aita!"), a green card with **today's date and the time**, a Read aloud button and **Choose a game** with one tile: 🔍 **Find the object**.
2. **Read aloud** speaks the greeting plus today's date ("…Today is Monday, 12 October. Shall we play a game?"). Try it in Hindi too.
3. Tap the tile → intro: big 🔍, title, instruction spoken automatically, "⭐ Level 1", and the Start button.
4. **Start**. Level 1 shows **2 pictures**, with the target's picture also shown in the prompt. The prompt is spoken ("Find the banana").
5. Tap the **wrong** picture: it dims, the right one glows **orange**, and you hear "Here it is — the banana. Tap it." Tap the right one: it goes green with ✓ and you hear praise, then the next round. (No red, no buzzer: errorless design.)
6. Progress dots fill at the top (6 rounds). After round 6: 🎉 "Well done, Aita!" with 1–3 stars.
7. **Adaptive difficulty:** play 2 sessions with every answer right the first time. On the 2nd celebration you see 🌟 "Next time: a new level!". Play again: the intro says **Level 2**, and the game shows **3 pictures**.
8. Keep going to **Level 3**: 4 pictures, and the prompt shows only the **name** (no picture).
9. **Level down:** at Level 3, get 4+ of 6 wrong on purpose. Play again: back to Level 2, with no "level down" message shown.
10. Tap **✖ Stop** mid-game: back to home, no crash.
11. Kill and reopen the app: the level is remembered. (Caregiver → Reset demo data resets levels to 1.)
12. Airplane mode: all of the above still works.
