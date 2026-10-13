/**
 * Cloud errors → one i18n key each (`cloud.errors.*`). Pure, so the mapping
 * from Supabase Auth / network failures is unit-tested.
 */
export type CloudErrorKey =
  | 'wrongPin'
  | 'alreadyRegistered'
  | 'offline'
  | 'tooMany'
  | 'invalidPhone'
  | 'invalidPin'
  | 'pinMismatch'
  | 'nameMissing'
  | 'wrongRole'
  | 'notConfigured'
  | 'notAllowed'
  | 'lastManager'
  | 'invalidCode'
  | 'codeWrongRole'
  | 'generic';

export class CloudError extends Error {
  constructor(
    readonly key: CloudErrorKey,
    readonly detail?: Record<string, string>,
  ) {
    super(key);
  }
}

type Errorish = { name?: string; message?: string; code?: string; status?: number };

export function errorKeyFor(e: unknown): CloudErrorKey {
  if (e instanceof CloudError) return e.key;
  const err = (e ?? {}) as Errorish;
  const msg = (err.message ?? '').toLowerCase();
  if (err.code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'wrongPin';
  if (err.code === 'user_already_exists' || err.code === 'email_exists' || msg.includes('already registered')) {
    return 'alreadyRegistered';
  }
  if (err.status === 429 || err.code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'tooMany';
  if (
    err.name === 'AuthRetryableFetchError' ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed')
  ) {
    return 'offline';
  }
  return 'generic';
}
