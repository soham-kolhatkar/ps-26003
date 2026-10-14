import { validateSignUp } from '../account';
import { CloudError, errorKeyFor } from '../errors';

describe('cloud error mapping', () => {
  it('maps Supabase auth and network failures to friendly keys', () => {
    expect(errorKeyFor({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('wrongPin');
    expect(errorKeyFor({ code: 'user_already_exists' })).toBe('alreadyRegistered');
    expect(errorKeyFor({ message: 'User already registered' })).toBe('alreadyRegistered');
    expect(errorKeyFor({ status: 429 })).toBe('tooMany');
    expect(errorKeyFor({ name: 'AuthRetryableFetchError' })).toBe('offline');
    expect(errorKeyFor(new TypeError('Network request failed'))).toBe('offline');
    expect(errorKeyFor(new Error('something odd'))).toBe('generic');
    expect(errorKeyFor(null)).toBe('generic');
    expect(errorKeyFor(new CloudError('wrongRole'))).toBe('wrongRole');
    expect(errorKeyFor({ code: '23514', message: 'violates check constraint "patients_age_check"' })).toBe(
      'invalidInput',
    );
  });
});

describe('sign-up form', () => {
  const ok = { role: 'asha' as const, name: 'Sunita Devi', phone: '98765 43210', pin: '135790', pinAgain: '135790' };
  it('normalises the phone when everything is valid', () => {
    expect(validateSignUp(ok)).toEqual({ phone: '+919876543210' });
  });
  it('reports the first problem', () => {
    const key = (over: Partial<typeof ok>) => {
      try {
        validateSignUp({ ...ok, ...over });
        return null;
      } catch (e) {
        return (e as CloudError).key;
      }
    };
    expect(key({ name: '  ' })).toBe('nameMissing');
    expect(key({ phone: '12345' })).toBe('invalidPhone');
    expect(key({ pin: '1234', pinAgain: '1234' })).toBe('invalidPin');
    expect(key({ pinAgain: '135791' })).toBe('pinMismatch');
  });
});
