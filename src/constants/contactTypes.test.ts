import { describe, it, expect } from 'vitest';
import {
  CONTACT_TYPES,
  CONTACT_TYPE_MAP,
  isValidContactValue,
  isValidContactLink,
} from './contactTypes';
import type { ContactType } from '../types';

describe('contactTypes config', () => {
  it('exposes one config per supported contact type', () => {
    const types = CONTACT_TYPES.map((c) => c.type);
    expect(types).toEqual([
      'email',
      'linkedin',
      'twitter',
      'github',
      'website',
      'sessionize',
    ]);
  });

  it('maps every type to its config', () => {
    for (const config of CONTACT_TYPES) {
      expect(CONTACT_TYPE_MAP[config.type]).toBe(config);
    }
  });
});

describe('email validation', () => {
  it.each(['a@b.co', 'first.last@example.com', '  spaced@ok.io  '])(
    'accepts %s',
    (value) => {
      expect(isValidContactValue('email', value)).toBe(true);
    },
  );

  it.each(['', 'no-at', 'a@b', 'a@b.', 'a b@c.com', 'https://x.com'])(
    'rejects %s',
    (value) => {
      expect(isValidContactValue('email', value)).toBe(false);
    },
  );
});

describe('url validation', () => {
  const urlTypes: ContactType[] = [
    'linkedin',
    'twitter',
    'github',
    'website',
    'sessionize',
  ];

  it.each(urlTypes)('accepts an https URL for %s', (type) => {
    expect(isValidContactValue(type, 'https://example.com/me')).toBe(true);
  });

  it('accepts an http URL and trims surrounding space', () => {
    expect(isValidContactValue('website', '  http://example.com  ')).toBe(true);
  });

  it.each(['', 'example.com', 'ftp://example.com', 'https://', 'https:// x'])(
    'rejects %s',
    (value) => {
      expect(isValidContactValue('website', value)).toBe(false);
    },
  );
});

describe('isValidContactLink', () => {
  it('validates the value against the link type', () => {
    expect(isValidContactLink({ type: 'email', value: 'me@example.com' })).toBe(
      true,
    );
    expect(
      isValidContactLink({ type: 'github', value: 'me@example.com' }),
    ).toBe(false);
    expect(
      isValidContactLink({ type: 'github', value: 'https://github.com/me' }),
    ).toBe(true);
  });
});
