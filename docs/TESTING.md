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
