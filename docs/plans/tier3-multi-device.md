# Plan: Tier 3, the multi-device Smriti (Supabase, phone + PIN)

## Context
Tiers 1–2 shipped as v0.1.0 and v0.2.0, on a single phone with a role picker.

For the SIH demo, the user wants **one phone per role** (patient, caregiver, ASHA, doctor). The first "who are you?" screen should go away, and phones should sync through a backend. Decisions already agreed with the user (D41 and this discussion):
- **Backend:** Supabase on the free plan: Postgres, auth, row-level security (RLS). Its JS client runs in Expo Go. Firebase was dropped because phone OTP needs the Blaze plan and native modules.
- **Sign-in:** phone number + 6-digit PIN, with no SMS. The screens are designed so a real OTP step can be added later.
- **Patients:** both the caregiver and the ASHA can create a patient, and whoever creates it becomes its manager. More than one caregiver per patient is allowed.
- **Patient's phone:** paired with a 6-digit code. The patient never logs in.
- **Photos** stay on the patient's phone and are never uploaded.
- **ASHA** may edit reminders. The **doctor** can leave short notes. A forgotten PIN is reset through a manager.
- **Fallback:** the single-phone demo mode stays hidden for venues without internet.

**Re-tiering** (the user asked for this): the old Tier 3 items and F14 (Assamese) move to **Tier 4**. The new Tier 3 = F15–F19 below, then tag `v0.3.0`.

The working agreement is unchanged: one feature per branch → `npm run check` → docs → push → STOP for a phone test → merge after approval.

## Architecture (applies to all features)
- **Two modes, two database files.**
  - The `device` store (zustand, persisted in `expo-sqlite/kv-store`, outside the DB) holds `mode: 'demo' | 'cloud'` and `deviceRole: 'patient' | 'caregiver' | 'asha' | 'doctor'`.
  - Demo mode = today's app, unchanged: `smriti.db`, the seed, `roles.tsx`, `pin/[userId].tsx`.
  - Cloud mode uses `smriti-cloud-<uid>.db`: no seed, owner uid recorded, wiped if the uid doesn't match.
  - `SQLiteProvider` is keyed by mode and uid, and `src/db/client.ts` gains `resetDb()`.
- **Existing screens are reused.** Sync fills the local tables they already read: `patient`, synthetic `household` rows (`h-<patientId>`), `patient_user` (new columns `member_role`, `is_manager`), `app_user` (co-members' profiles, with id = auth uid), reminders, events, sessions, levels and visits. Caregiver, ASHA and doctor screens keep using `listPatientsForUser` and friends.
- **New modules:**
  - `src/cloud/`: `client.ts` (supabase-js with kv-store auth storage, `detectSessionInUrl: false`, auto-refresh tied to AppState); `remote.ts` (the `RemoteApi` interface); `supabaseRemote.ts`; `memoryRemote.ts` (an in-memory fake that simulates RLS and two devices, for jest); `auth.ts` (phone → `p<E164digits>@phone.smriti.app`, PIN → password).
  - `src/sync/`: `outbox`, `push`, `pull`, `scheduler`, `status` store.
  - `supabase/migrations/*.sql`: the user pastes these into the SQL Editor.
- **Cloud schema**, delivered one SQL file per feature so each step can be checked: `001` accounts/profiles (F15), `002` patients, members, invites and pairing (F16), `003` synced data tables (F17), `004` doctor notes and PIN reset (F18). The user pastes each into the SQL Editor. The full schema:
  - Tables: `profiles` (name, phone, org, district; **no role** column that grants rights), `patients` (+village, district, created_by, `updated_at`, `deleted_at`), `patient_members` (role caregiver|asha|doctor|device, relation, is_manager), `invites`, `invite_attempts`, `reminders`, `reminder_events`, `game_sessions`, `game_levels`, `visits`, `doctor_notes`.
  - `updated_at` is set by a server trigger.
  - Access rules use the `SECURITY DEFINER` helpers `is_member(pid)`, `is_manager(pid)` and `member_role(pid)`. Anonymous users are excluded everywhere (`auth.jwt()->>'is_anonymous'`), except for `redeem_invite` and a device-role member's own patient data.
- **RPC functions** (server-side Postgres functions the app calls, instead of writing tables directly):
  - `create_patient(...)`: inserts the patient and its manager membership in one step.
  - `create_invite(pid, role, relation)`: managers only; 15 minutes for a device code, 7 days for others.
  - `redeem_invite(code)`: an atomic `UPDATE … WHERE used_by IS NULL AND expires_at > now() RETURNING`, capped at 5 failed attempts per user per hour. Redeeming a device code removes the previous device member.
  - `remove_member` and `leave_patient`.
- **Sync rules:**
  - **Outbox:** local SQLite triggers write `sync_outbox(seq, table, row_id, op)`, only in the cloud DB, and only when `sync_flag.applying = 0`. Repos stay unchanged. Hard deletes become soft deletes in the cloud.
  - **One loop under one lock:** push, then pull. Push deletes only outbox entries up to the `seq` it actually pushed. Pull skips any row that is still in the outbox.
  - **Pull:**
    - per table, rows where `updated_at > cursor − 5 s`, ordered by `(updated_at, id)`;
    - paged at 1,000 rows per request;
    - the cursor is the largest server `updated_at` received;
    - each pull is applied in one transaction with `PRAGMA defer_foreign_keys = ON`;
    - unknown user references are set to null.
  - **Membership changes:** when this device's set of patients changes, reset the cursors and pull the new patient's full history. Purge local rows for patients the user has left.
  - **Reminder events:**
    - Ids become deterministic, `${reminderId}:${dueAt}`, in `ensureEvents` and `occurrenceFor`.
    - Pull upserts with `ON CONFLICT(reminder_id, due_at)`.
    - Only taken or skipped events are pushed.
    - A server trigger never lets taken or skipped go back to pending.
    - When a pulled reminder has changed or been deleted, its future pending events are cleaned up locally, as `saveReminder` already does for local edits.
    - Reads filter out `deleted_at`.
  - **`game_level`:** only the patient's phone writes it, and the server keeps the newer `updated_at`. A newly paired phone unlocks games only after its first pull.
  - **Not synced:** alerts (still computed on each phone) and photos.
  - **When sync runs:** at start, when the app comes to the foreground, when the network returns (`expo-network`), 2 s after a write (debounced), and every 30 s in the foreground.
  - **Notifications:** after a pull changes reminders, the patient's phone runs `syncReminderNotifications`. Staff phones schedule nothing.
- **Sign-out and role change:**
  1. Try a final push, and warn if changes are still waiting.
  2. Cancel all notifications.
  3. `signOut()`, then reset the DB singleton, then remount.

## Tier 3 features

### F15 Cloud foundation, device setup and accounts
- **The user, before coding starts:** creates the Supabase project (Mumbai region). Sends me the Project URL and the anon key. Turns email confirmation off and anonymous sign-ins on. Pastes `001_profiles.sql` into the SQL Editor.
- **Me:**
  1. Check that `*.supabase.co` is reachable from WSL and from the phone (corporate network).
  2. Add `@supabase/supabase-js`, `expo-network` and `react-native-url-polyfill` (if the versioned docs require it) with `npx expo install`.
  3. Keep the URL and key in `.env` (`EXPO_PUBLIC_SUPABASE_*`, gitignored), with a committed `.env.example`.
- **Flow:**
  1. Welcome/language.
  2. **"Who will use this phone?"** with 4 big cards. A long-press on the logo opens "Demo on one phone", which leads to today's role picker.
  3. Staff: **Sign up** (name, phone, 6-digit PIN twice, organisation/sub-centre, district) or **Sign in** (phone + PIN). Patient: a pairing placeholder until F16.
  4. The phone stays signed in after a restart.
  5. A new **Settings** screen: account, sign out, change this phone's role.
- `RoleStack` is unchanged. In cloud mode `session.signInStaff(role, uid)` is restored at start.
- **Web build for testing.** User decision: build and test with **one phone + several Chromium browsers**; real separate phones are used only for the judges.
  - Make the app run with `npx expo start --web`.
  - expo-sqlite on web needs the WASM build and COOP/COEP headers, set in `metro.config.js`.
  - Native-only services get web fallbacks: notifications become a no-op, haptics a no-op, speech uses `expo-speech` web or the browser's speechSynthesis, secure-store uses kv-store, image-picker uses a file input.
  - Each browser profile or Playwright context = one "device" with its own storage.
  - Add `npm run web` plus a Playwright e2e harness (`e2e/`, the `playwright` dev dependency with a user-space Chromium download) that drives 2–3 contexts at once.
  - Risk: headless Chromium in WSL may lack system libraries, and installing them needs admin. The fallback is the user's Windows Chrome/Edge windows (profiles or incognito) at `http://localhost:8081`, with me giving step-by-step checks.
- **Files:**
  - New: `src/store/device.ts`, `src/cloud/*`, `src/app/setup.tsx`, `src/app/auth/{sign-in,sign-up}.tsx`, `src/app/settings.tsx`, `supabase/migrations/001_profiles.sql`.
  - Changed: `src/app/_layout.tsx` (provider keyed by mode and uid, cloud start-up), `src/app/index.tsx`, `src/db/client.ts`, `src/db/init.ts` (no seed in cloud), the i18n packs.

### F16 Patients, people, invites and pairing
- **Creating patients:** caregiver home "Add your family member" and ASHA "Register a patient", both through the `create_patient` RPC. Empty states on both homes.
- **People screen** per patient (`/<role>/people?patientId`):
  - members with roles;
  - managers can **Pair the patient's phone** (code + 15-minute countdown);
  - **Invite ASHA worker / doctor / family member** (code + a WhatsApp-ready message via RN `Share`);
  - **Remove** a member; any member can **Leave**.
- **Join with a code** (ASHA, doctor, family): `redeem_invite`.
- **Patient's phone:**
  1. Anonymous sign-in.
  2. Enter the pairing code.
  3. The caregiver sets a 4-digit **family PIN for this phone**, reusing `src/services/auth.ts` `setPin`.
  4. `device_patient_id` is set and the phone opens the patient home.
  5. A PIN-protected **family corner** (long-press the avatar) holds the photo screens, reusing the caregiver photo components. Photos stay on this phone.
- **First sync slice:** pull profiles, patients and members into local `patient`, `household`, `patient_user` and `app_user` (migration v6 adds `member_role`, `is_manager`, `deleted_at` where needed, and `sync_*` tables).

### F17 Data sync
- Outbox triggers, push and pull for reminders, reminder_events, game_sessions, game_levels and visits. All the sync rules above apply, including the membership-change full pull and purge.
- **Deterministic event ids**, applied to the cloud DB only.
- A **sync chip** in `StaffHeader`: "✓ Synced 2 min ago / ⏳ 3 changes waiting / 📴 Offline". The patient's phone shows none.
- In cloud mode, "Test in 10 s" becomes "on this phone" for staff phones.
- **Tests** (`memoryRemote`, two simulated devices):
  - an edit during a pull is not lost;
  - an event created on both phones;
  - taken is never downgraded;
  - a join pulls the full history, and leaving purges it;
  - foreign-key ordering;
  - paging past 1,000 rows;
  - the level authority rule;
  - soft-deleted reminders.

### F18 Role extras and PIN reset
- **ASHA edits reminders:** reuse `caregiver/reminder-edit.tsx` as a shared component, reached from the ASHA patient page.
- **Doctor's notes:** written on the doctor report, shown on the caregiver dashboard and the ASHA patient page. Synced through the `doctor_notes` table.
- **PIN reset:** a manager issues a reset code. The user enters it with a new PIN, and a Supabase **Edge Function** (`supabase/functions/reset-pin`, created in the dashboard editor) updates the password using the service key, which stays only on the server.

### F19 Cloud demo story, 4-phone demo, and T3
- **Hidden "Demo tools"** (from Settings):
  1. Build the existing demo story into a temporary SQLite DB, reusing `seedDemo` / `seedGameHistory` / `seedVisits` in `src/db/seed/demo.ts`.
  2. Sign up or sign in the 3 demo staff accounts (fixed demo phones, PIN 123456). Create the patients through the RPCs: Priya manages Kamala; Sunita manages Lakshmi and Ramesh.
  3. Link the members by invites. Upload the history in pages.
  4. Show the pairing code for Kamala's phone.
- **Reset cloud demo:** managers delete their patients (cascade), then re-run.
- **Docs:** `docs/DEMO.md` gets a 4-phone script plus the single-phone fallback; `docs/TESTING.md` gets the checklists.
- **T3:** APK v0.3.0 (versionCode 3, `npm run build:apk`), tag `v0.3.0`.

## Tier 4 (moved here)
- F14 Assamese pack.
- A low-resource language (Manipuri/Khasi/Mizo) with recorded audio.
- PDF report export.
- Real SMS OTP (MSG91 + DLT) and a login Edge Function with lockout.
- Realtime updates.
- Accessibility and animation polish.
- Play Store signing.

## Docs to update when the work starts
- `docs/PROGRESS.md`: re-tier into Tier 3 = F15–F19 and Tier 4.
- `docs/DECISIONS.md`: D42 (sync design incl. the risks above), D43 (cloud access rules and the `create_patient` / invite / pairing functions; the PIN is pilot-only).
- `docs/ARCHITECTURE.md`: the cloud and sync layer.
- `CLAUDE.md`: cloud gotchas (`.env`, never the service key in the app, pasting SQL migrations, free-plan pause).
- The memory file.

## Verification
- **Every feature:** `npm run check`, then a phone test in Expo Go (cold restart after pack edits), then the Metro log free of `ERROR|WARN`.
- **Pure logic and sync:** jest with `memoryRemote` and node SQLite (`src/db/testing/nodeDb.ts`).
- **Access rules:** a small SQL test script (`supabase/tests/rls.sql`) the user can run in the SQL Editor, plus a manual two-account check.
- **F15:** sign up on the phone → restart (still signed in) → sign out and in → demo mode still works. Run with airplane mode on, and confirm demo mode still works fully offline.
- **F16/F17:** use **the phone (patient, in Expo Go) plus Chromium contexts** for the caregiver, ASHA and doctor. Playwright e2e scripts cover the browser-only flows, and the user repeats them by hand on the phone:
  1. The caregiver creates Kamala, invites the ASHA, and pairs the patient's phone.
  2. The patient plays a game. Within about 30 s it shows on the caregiver's dashboard and the ASHA list.
  3. The caregiver adds a reminder, and the patient's phone schedules it.
  4. The patient's phone, offline, plays and marks a dose taken. When it comes back online, everything syncs.
- **F19:** the full 4-phone demo story from `docs/DEMO.md`, then the single-phone fallback with airplane mode on.
