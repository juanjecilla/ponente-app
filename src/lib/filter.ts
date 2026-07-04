import type { CostTier, Speaker } from '../types';

/**
 * Client-side faceted-filter state for the public directory. Each facet is a
 * list of selected values; an empty list means "no constraint" for that facet.
 * All matching is done in memory over the one-shot `getPublishedSpeakers`
 * result (MVP scale — tens of speakers).
 */
export interface SpeakerFilterState {
  /** Normalized city keys (`CityAvailability.key`). */
  cityKeys: string[];
  /** Selected cost tiers. */
  tiers: CostTier[];
  /** Selected topic slugs (`Speaker.topics`). */
  topics: string[];
}

/** The empty filter (everything passes). */
export const EMPTY_FILTER: SpeakerFilterState = {
  cityKeys: [],
  tiers: [],
  topics: [],
};

/**
 * Parses a `cityTierTokens` entry (`${key}:${tier}`, e.g. `"madrid:free"`) into
 * its parts. City keys are normalized (never contain `:`) and tiers may contain
 * hyphens (`needs-expenses`), so we split on the LAST colon.
 */
export function parseCityTierToken(token: string): {
  key: string;
  tier: string;
} {
  const idx = token.lastIndexOf(':');
  if (idx < 0) return { key: token, tier: '' };
  return { key: token.slice(0, idx), tier: token.slice(idx + 1) };
}

/**
 * True when the speaker satisfies the combined city + tier facets. City and
 * tier share the `cityTierTokens`, so when BOTH are constrained a single token
 * must match both (e.g. "free specifically in Madrid"), not two separate
 * tokens. When only one is constrained, any token satisfying it matches.
 */
function matchesCityTier(speaker: Speaker, state: SpeakerFilterState): boolean {
  const hasCity = state.cityKeys.length > 0;
  const hasTier = state.tiers.length > 0;
  if (!hasCity && !hasTier) return true;
  return speaker.cityTierTokens.some((token) => {
    const { key, tier } = parseCityTierToken(token);
    const cityOk = !hasCity || state.cityKeys.includes(key);
    const tierOk = !hasTier || state.tiers.includes(tier as CostTier);
    return cityOk && tierOk;
  });
}

/**
 * True when the speaker matches the topic facet. Topics use OR semantics (a
 * speaker matches if they speak on ANY selected topic) — friendlier for
 * discovery than requiring all of them.
 */
function matchesTopics(speaker: Speaker, state: SpeakerFilterState): boolean {
  if (state.topics.length === 0) return true;
  return speaker.topics.some((slug) => state.topics.includes(slug));
}

/**
 * Pure, in-memory faceted filter over the published-speaker list. City+tier are
 * matched against `cityTierTokens`; topics use OR semantics. Facets combine
 * with AND (a speaker must satisfy every constrained facet).
 */
export function filterSpeakers(
  speakers: Speaker[],
  state: SpeakerFilterState,
): Speaker[] {
  return speakers.filter(
    (s) => matchesCityTier(s, state) && matchesTopics(s, state),
  );
}

/** A distinct city option, derived from the loaded speakers' availabilities. */
export interface CityOption {
  key: string;
  name: string;
}

/**
 * Derives the distinct city options present across the loaded speakers, so the
 * city filter only offers cities that actually have a match. Deduped by `key`
 * (first display name wins) and sorted alphabetically by display name.
 */
export function deriveCityOptions(speakers: Speaker[]): CityOption[] {
  const byKey = new Map<string, string>();
  for (const speaker of speakers) {
    for (const city of speaker.cities) {
      if (!byKey.has(city.key)) byKey.set(city.key, city.name);
    }
  }
  return [...byKey.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Derives the distinct topic slugs present across the loaded speakers, so the
 * topic filter only offers topics with at least one match. Sorted for a stable
 * render order; labels are resolved by the caller via `useTags`.
 */
export function deriveTopicSlugs(speakers: Speaker[]): string[] {
  const slugs = new Set<string>();
  for (const speaker of speakers) {
    for (const slug of speaker.topics) slugs.add(slug);
  }
  return [...slugs].sort((a, b) => a.localeCompare(b));
}
