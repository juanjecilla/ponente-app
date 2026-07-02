import type { CostTier } from '../constants/tiers';

// LOCAL types — reconcile with `src/types` (CityAvailability) when task 03 lands.

/** A city resolved from Photon (or the static fallback). No cost tier yet. */
export interface CityResult {
  name: string; // canonical display name, e.g. "Madrid, Spain"
  key: string; // normalized slug for matching, e.g. "madrid"
  lat: number;
  lng: number;
}

/** A city a speaker can travel to, paired with a cost tier. */
export interface CityAvailability extends CityResult {
  tier: CostTier;
}

/**
 * Normalize a city name into a stable slug used both as the stored `key` and
 * for filter matching, so "Madrid", "Madrid, Spain" and "MADRID" collapse.
 * Strips accents, lowercases, trims and hyphenates whitespace.
 * "São Paulo" -> "sao-paulo", "Málaga" -> "malaga".
 */
export const normalizeCityKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accent marks
    .toLowerCase()
    .trim()
    .replace(/,.*$/, '') // drop ", State, Country" suffix
    .trim()
    .replace(/\s+/g, '-');

/** Derived faceted-filter token: `${cityKey}:${tier}` e.g. "madrid:free". */
export const cityTierToken = (key: string, tier: CostTier): string =>
  `${key}:${tier}`;

/**
 * Client-side fuzzy filter over the static fallback list. Matches on the
 * normalized key or a substring of the display name (accent-insensitive).
 */
export const filterStaticCities = (
  cities: readonly CityResult[],
  query: string,
): CityResult[] => {
  const q = normalizeCityKey(query);
  if (!q) return [];
  return cities.filter(
    (c) => c.key.includes(q) || normalizeCityKey(c.name).includes(q),
  );
};
