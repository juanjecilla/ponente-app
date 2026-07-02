import { describe, it, expect } from 'vitest';
import { normalizeCityKey, cityTierToken, filterStaticCities } from './city';
import type { CityResult } from './city';

describe('normalizeCityKey', () => {
  it('lowercases and trims', () => {
    expect(normalizeCityKey('  MADRID  ')).toBe('madrid');
  });

  it('strips accents', () => {
    expect(normalizeCityKey('Málaga')).toBe('malaga');
    expect(normalizeCityKey('São Paulo')).toBe('sao-paulo');
  });

  it('drops the ", State, Country" suffix', () => {
    expect(normalizeCityKey('Madrid, Spain')).toBe('madrid');
    expect(normalizeCityKey('A Coruña, Galicia, Spain')).toBe('a-coruna');
  });

  it('hyphenates internal whitespace', () => {
    expect(normalizeCityKey('San Sebastian')).toBe('san-sebastian');
  });

  it('collapses variants of the same city to one key', () => {
    const variants = ['Madrid', 'MADRID', 'Madrid, Spain', '  madrid '];
    const keys = new Set(variants.map(normalizeCityKey));
    expect(keys.size).toBe(1);
  });
});

describe('cityTierToken', () => {
  it('joins key and tier with a colon', () => {
    expect(cityTierToken('madrid', 'free')).toBe('madrid:free');
    expect(cityTierToken('lisbon', 'needs-expenses')).toBe(
      'lisbon:needs-expenses',
    );
  });
});

describe('filterStaticCities', () => {
  const cities: CityResult[] = [
    { name: 'Madrid, Spain', key: 'madrid', lat: 40.4, lng: -3.7 },
    { name: 'Málaga, Spain', key: 'malaga', lat: 36.7, lng: -4.4 },
    { name: 'Lisbon, Portugal', key: 'lisbon', lat: 38.7, lng: -9.1 },
  ];

  it('matches by key substring', () => {
    expect(filterStaticCities(cities, 'mad').map((c) => c.key)).toEqual([
      'madrid',
    ]);
  });

  it('matches accent-insensitively via the display name', () => {
    expect(filterStaticCities(cities, 'Malaga').map((c) => c.key)).toEqual([
      'malaga',
    ]);
  });

  it('returns [] for an empty query', () => {
    expect(filterStaticCities(cities, '   ')).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    expect(filterStaticCities(cities, 'tokyo')).toEqual([]);
  });
});
