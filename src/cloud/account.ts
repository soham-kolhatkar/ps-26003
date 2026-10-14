import type { DeviceRole } from '@/store/device';

import { supabase } from './client';
import { CloudError, errorKeyFor } from './errors';
import { isValidPin, normalizePhone, phoneToEmail, pinToPassword } from './phone';

export type StaffRole = Exclude<DeviceRole, 'patient'>;

export type Profile = {
  id: string;
  role: StaffRole;
  name: string;
  phone: string;
  organization: string | null;
  district: string | null;
};

export type SignUpInput = {
  role: StaffRole;
  name: string;
  phone: string;
  pin: string;
  pinAgain: string;
  organization?: string;
  district?: string;
};

/** Checks the form before any network call; throws CloudError with the first problem. */
export function validateSignUp(input: SignUpInput): { phone: string } {
  if (!input.name.trim()) throw new CloudError('nameMissing');
  const phone = normalizePhone(input.phone);
  if (!phone) throw new CloudError('invalidPhone');
  if (!isValidPin(input.pin)) throw new CloudError('invalidPin');
  if (input.pin !== input.pinAgain) throw new CloudError('pinMismatch');
  return { phone };
}

async function wrap<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof CloudError) throw e;
    console.warn('Cloud request failed', e);
    throw new CloudError(errorKeyFor(e));
  }
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('id, role, name, phone, organization, district')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/** The account must match what this phone is set up for. */
function assertRole(profile: Profile | null, role: StaffRole): Profile {
  if (!profile) throw new CloudError('generic');
  if (profile.role !== role) throw new CloudError('wrongRole', { role: profile.role });
  return profile;
}

export function signUp(input: SignUpInput): Promise<Profile> {
  return wrap(async () => {
    const { phone } = validateSignUp(input);
    const { data, error } = await supabase().auth.signUp({
      email: phoneToEmail(phone),
      password: pinToPassword(input.pin),
      options: {
        // Profile fields for the sign-up trigger (001). Never used for authorization.
        data: {
          role: input.role,
          name: input.name.trim(),
          phone,
          organization: input.organization?.trim() ?? '',
          district: input.district?.trim() ?? '',
        },
      },
    });
    if (error) throw error;
    // With "Confirm email" off, sign-up returns a session at once.
    if (!data.session || !data.user) throw new CloudError('generic');
    return assertRole(await fetchProfile(data.user.id), input.role);
  });
}

export function signIn(role: StaffRole, phoneInput: string, pin: string): Promise<Profile> {
  return wrap(async () => {
    const phone = normalizePhone(phoneInput);
    if (!phone) throw new CloudError('invalidPhone');
    if (!isValidPin(pin)) throw new CloudError('invalidPin');
    const { data, error } = await supabase().auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: pinToPassword(pin),
    });
    if (error) throw error;
    try {
      return assertRole(await fetchProfile(data.user.id), role);
    } catch (e) {
      // Wrong kind of account for this phone: don't stay half signed in.
      await supabase().auth.signOut({ scope: 'local' });
      throw e;
    }
  });
}

/** Forgot PIN: phone + the reset code from a manager + a new PIN (Edge Function `reset-pin`). */
export function resetPinWithCode(phoneInput: string, code: string, pin: string, pinAgain: string): Promise<void> {
  return wrap(async () => {
    const phone = normalizePhone(phoneInput);
    if (!phone) throw new CloudError('invalidPhone');
    if (code.replace(/\D/g, '').length !== 6) throw new CloudError('invalidCode');
    if (!isValidPin(pin)) throw new CloudError('invalidPin');
    if (pin !== pinAgain) throw new CloudError('pinMismatch');
    const { data, error } = await supabase().functions.invoke('reset-pin', {
      body: { phone, code: code.replace(/\D/g, ''), pin },
    });
    if (error) {
      // 4xx from the function = a code that did not fit; anything else = network / server.
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status && status < 500) throw new CloudError('invalidCode');
      throw error;
    }
    if (!(data as { ok?: boolean })?.ok) throw new CloudError('invalidCode');
  });
}

/** Signs out this phone only (other phones of the same person stay signed in). */
export async function signOutCloud(): Promise<void> {
  await supabase()
    .auth.signOut({ scope: 'local' })
    .catch((e) => console.warn('Sign-out request failed (signed out locally anyway)', e));
}
