import { describe, it, expect } from 'vitest';
import {
  resolveDebugToken,
  shouldEnableAppCheck,
  type AppCheckEnv,
} from './app-check';

describe('shouldEnableAppCheck', () => {
  it('is true when a non-empty site key is present', () => {
    expect(shouldEnableAppCheck({ siteKey: 'abc123' })).toBe(true);
  });

  it('is false when the site key is absent (the resilience guard)', () => {
    expect(shouldEnableAppCheck({})).toBe(false);
    expect(shouldEnableAppCheck({ siteKey: undefined })).toBe(false);
  });

  it('is false when the site key is empty or whitespace-only', () => {
    expect(shouldEnableAppCheck({ siteKey: '' })).toBe(false);
    expect(shouldEnableAppCheck({ siteKey: '   ' })).toBe(false);
  });

  it('ignores debug token / dev when deciding whether to init', () => {
    expect(shouldEnableAppCheck({ debugToken: 'token', dev: true })).toBe(
      false,
    );
  });
});

describe('resolveDebugToken', () => {
  const base: AppCheckEnv = { siteKey: 'abc123', dev: true };

  it('returns undefined outside dev', () => {
    expect(
      resolveDebugToken({ ...base, dev: false, debugToken: 'token' }),
    ).toBeUndefined();
    expect(resolveDebugToken({ debugToken: 'token' })).toBeUndefined();
  });

  it('returns undefined in dev when no debug token is set', () => {
    expect(resolveDebugToken({ ...base })).toBeUndefined();
    expect(resolveDebugToken({ ...base, debugToken: '' })).toBeUndefined();
    expect(resolveDebugToken({ ...base, debugToken: '   ' })).toBeUndefined();
  });

  it('maps the literal string "true" to boolean true (auto-generate + log)', () => {
    expect(resolveDebugToken({ ...base, debugToken: 'true' })).toBe(true);
  });

  it('uses a concrete token string verbatim (trimmed)', () => {
    expect(
      resolveDebugToken({ ...base, debugToken: 'my-registered-token' }),
    ).toBe('my-registered-token');
    expect(resolveDebugToken({ ...base, debugToken: '  my-token  ' })).toBe(
      'my-token',
    );
  });
});
