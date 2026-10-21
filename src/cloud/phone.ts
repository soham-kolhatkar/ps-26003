/**
 * Phone number + PIN → Supabase email/password (D41, D43). Pure.
 *
 * Indian mobile numbers only for now: 10 digits starting 6–9, with an
 * optional +91 / 91 / 0 prefix and any spaces or dashes. The PIN is 6 digits.
 * No SMS proves the number belongs to the person (pilot-grade; OTP is Tier 4).
 */
export const PIN_DIGITS = 6;
const EMAIL_DOMAIN = 'phone.smriti.app';

/** "+91 98765-43210", "09876543210", "9876543210" → "+919876543210"; anything else → null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** "+919876543210" → "98765 43210" for display. */
/** "98765 43210" with a no-break space, so a number never splits across two lines. */
export function formatPhone(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return d.length === 10 ? `${d.slice(0, 5)}\u00A0${d.slice(5)}` : e164;
}

export function phoneToEmail(e164: string): string {
  return `p${e164.replace(/\D/g, '')}@${EMAIL_DOMAIN}`;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_DIGITS}}$`).test(pin);
}

/** Supabase needs ≥ 6 characters; the prefix keeps us clear of stricter project settings. */
export function pinToPassword(pin: string): string {
  return `smriti:${pin}`;
}
