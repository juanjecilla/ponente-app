import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';

/** Flatten a nested translation object into a sorted list of dotted key paths. */
function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([key, value]) =>
      flatKeys(value, prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}

describe('i18n locale parity', () => {
  it('EN and ES have an identical key set', () => {
    expect(flatKeys(es)).toEqual(flatKeys(en));
  });
});
