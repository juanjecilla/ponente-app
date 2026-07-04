import { describe, it, expect } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import {
  deriveCityOptions,
  deriveTopicSlugs,
  EMPTY_FILTER,
  filterSpeakers,
  parseCityTierToken,
} from './filter';
import type { CityAvailability, Speaker } from '../types';

const ts = {} as Timestamp;

function makeSpeaker(
  uid: string,
  cities: CityAvailability[],
  topics: string[],
): Speaker {
  return {
    uid,
    name: uid,
    topics,
    cities,
    cityTierTokens: cities.map((c) => `${c.key}:${c.tier}`),
    contactLinks: [],
    gdeVerified: false,
    published: true,
    disabled: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

const city = (
  name: string,
  key: string,
  tier: CityAvailability['tier'],
): CityAvailability => ({ name, key, lat: 0, lng: 0, tier });

const ada = makeSpeaker(
  'ada',
  [
    city('Madrid, Spain', 'madrid', 'free'),
    city('Barcelona', 'barcelona', 'needs-expenses'),
  ],
  ['android', 'kotlin'],
);
const bob = makeSpeaker(
  'bob',
  [city('Madrid', 'madrid', 'needs-expenses')],
  ['web'],
);
const cleo = makeSpeaker(
  'cleo',
  [city('Sevilla', 'sevilla', 'self-covered')],
  ['android'],
);
const all = [ada, bob, cleo];

describe('parseCityTierToken', () => {
  it('splits key and tier on the last colon (tier may contain hyphens)', () => {
    expect(parseCityTierToken('madrid:needs-expenses')).toEqual({
      key: 'madrid',
      tier: 'needs-expenses',
    });
  });

  it('handles a token with no colon', () => {
    expect(parseCityTierToken('madrid')).toEqual({ key: 'madrid', tier: '' });
  });
});

describe('filterSpeakers', () => {
  it('returns everything with the empty filter', () => {
    expect(filterSpeakers(all, EMPTY_FILTER)).toEqual(all);
  });

  it('filters by city key', () => {
    const result = filterSpeakers(all, {
      ...EMPTY_FILTER,
      cityKeys: ['madrid'],
    });
    expect(result).toEqual([ada, bob]);
  });

  it('filters by cost tier', () => {
    const result = filterSpeakers(all, { ...EMPTY_FILTER, tiers: ['free'] });
    expect(result).toEqual([ada]);
  });

  it('combines city + tier against a single token (not two separate ones)', () => {
    // ada is madrid:free and barcelona:needs-expenses — she must NOT match
    // "needs-expenses IN madrid"; only bob (madrid:needs-expenses) does.
    const result = filterSpeakers(all, {
      ...EMPTY_FILTER,
      cityKeys: ['madrid'],
      tiers: ['needs-expenses'],
    });
    expect(result).toEqual([bob]);
  });

  it('filters topics with OR semantics', () => {
    const result = filterSpeakers(all, {
      ...EMPTY_FILTER,
      topics: ['android'],
    });
    expect(result).toEqual([ada, cleo]);
  });

  it('combines facets with AND across facets', () => {
    const result = filterSpeakers(all, {
      ...EMPTY_FILTER,
      cityKeys: ['madrid'],
      topics: ['android'],
    });
    expect(result).toEqual([ada]);
  });

  it('matches an accented city via its normalized key', () => {
    // Keys are stored pre-normalized ("Málaga" → "malaga"); filtering by the
    // normalized key must match the token derived from the accented display name.
    const spk = makeSpeaker(
      'malaga-speaker',
      [city('Málaga, Spain', 'malaga', 'free')],
      ['web'],
    );
    const result = filterSpeakers([spk], {
      ...EMPTY_FILTER,
      cityKeys: ['malaga'],
    });
    expect(result).toEqual([spk]);
  });

  it('returns no matches when nothing satisfies the filter', () => {
    expect(
      filterSpeakers(all, { ...EMPTY_FILTER, cityKeys: ['tokyo'] }),
    ).toEqual([]);
  });
});

describe('deriveCityOptions', () => {
  it('dedupes by key and sorts by display name', () => {
    const options = deriveCityOptions(all);
    expect(options).toEqual([
      { key: 'barcelona', name: 'Barcelona' },
      { key: 'madrid', name: 'Madrid, Spain' },
      { key: 'sevilla', name: 'Sevilla' },
    ]);
  });
});

describe('deriveTopicSlugs', () => {
  it('returns distinct sorted slugs', () => {
    expect(deriveTopicSlugs(all)).toEqual(['android', 'kotlin', 'web']);
  });
});
