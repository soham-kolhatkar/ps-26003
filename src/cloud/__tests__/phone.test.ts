import { formatPhone, isValidPin, normalizePhone, phoneToEmail, pinToPassword } from '../phone';

describe('phone numbers', () => {
  it('accepts Indian mobiles in the usual ways of writing them', () => {
    for (const input of [
      '9876543210',
      '+91 98765 43210',
      '+91-98765-43210',
      '919876543210',
      '09876543210',
      ' 98765 43210 ',
    ]) {
      expect(normalizePhone(input)).toBe('+919876543210');
    }
  });

  it('rejects landlines, short numbers and other countries', () => {
    for (const input of ['', '12345', '5876543210', '98765432101', '+1 202 555 0143', 'abcdefghij', '+9198765']) {
      expect(normalizePhone(input)).toBeNull();
    }
  });

  it('formats for display and maps to a stable email', () => {
    expect(formatPhone('+919876543210')).toBe('98765 43210');
    expect(phoneToEmail('+919876543210')).toBe('p919876543210@phone.smriti.app');
  });
});

describe('PIN', () => {
  it('is exactly 6 digits', () => {
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
  });

  it('becomes a password Supabase accepts', () => {
    expect(pinToPassword('123456').length).toBeGreaterThanOrEqual(6);
    expect(pinToPassword('123456')).not.toBe(pinToPassword('654321'));
  });
});
