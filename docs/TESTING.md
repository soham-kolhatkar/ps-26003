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
