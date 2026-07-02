import { useEffect, useState } from 'react';
import { normalizeCityKey, filterStaticCities } from '../lib/city';
import type { CityResult } from '../lib/city';
import { searchCities, loadStaticCities } from '../lib/photon';

// Fair-use: never fire per-keystroke. Debounce >= 300ms (ADR 0003).
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const EMPTY: CityResult[] = [];

// Module-level query cache, shared across every consumer so canonical keys and
// results stay consistent app-wide (the directory filter reuses this hook).
const queryCache = new Map<string, CityResult[]>();

/** Test-only: clear the shared query cache between cases. */
export function __resetCitySearchCache(): void {
  queryCache.clear();
}

export interface UseCitySearch {
  results: CityResult[];
  loading: boolean;
  /** True when Photon failed and results (if any) came from the static list. */
  usedFallback: boolean;
}

interface AsyncState {
  key: string;
  results: CityResult[];
  usedFallback: boolean;
}

const IDLE: AsyncState = { key: '', results: EMPTY, usedFallback: false };

/**
 * Debounced, abortable, cached city search.
 * - Debounces input >= 300ms and aborts the in-flight request on new input.
 * - Caches successful results in memory keyed by the normalized query.
 * - Falls back to the bundled `public/data/cities.json` when Photon fails, or
 *   when autocomplete is disabled (`enabled = false`).
 *
 * @param enabled Whether live Photon autocomplete is on. Defaults to true.
 *   TODO(task 03/parallel PR): wire to the Remote Config flag
 *   `enable_city_autocomplete` instead of a plain prop.
 */
export function useCitySearch(query: string, enabled = true): UseCitySearch {
  const [state, setState] = useState<AsyncState>(IDLE);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  const cacheKey = tooShort
    ? ''
    : `${enabled ? 'live' : 'static'}:${normalizeCityKey(trimmed)}`;
  const cached = cacheKey ? queryCache.get(cacheKey) : EMPTY;

  useEffect(() => {
    // Synchronous cases (too short / cache hit) are derived below — no fetch.
    if (tooShort || cached) return;

    let cancelled = false;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const found = enabled
            ? await searchCities(trimmed, controller.signal)
            : filterStaticCities(await loadStaticCities(), trimmed);
          if (cancelled) return;
          queryCache.set(cacheKey, found);
          setState({ key: cacheKey, results: found, usedFallback: false });
        } catch {
          // Aborted request: a newer effect owns the state — ignore.
          if (cancelled || controller.signal.aborted) return;
          // Photon failed -> degrade to the static list (not cached, so a
          // later query can retry the live search).
          try {
            const fallback = filterStaticCities(
              await loadStaticCities(),
              trimmed,
            );
            if (cancelled) return;
            setState({ key: cacheKey, results: fallback, usedFallback: true });
          } catch {
            if (cancelled) return;
            setState({ key: cacheKey, results: EMPTY, usedFallback: true });
          }
        }
      };
      void run();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [cacheKey, tooShort, trimmed, enabled, cached]);

  const resolvedByState = state.key === cacheKey && !tooShort;
  const results = tooShort
    ? EMPTY
    : (cached ?? (resolvedByState ? state.results : EMPTY));
  const loading = !tooShort && !cached && !resolvedByState;
  const usedFallback = resolvedByState && state.usedFallback;

  return { results, loading, usedFallback };
}
