import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPublishedSpeakers } from '../lib/firestore';
import { measureTrace } from '../lib/perf';
import { errorTracker } from '../lib/error-tracker';
import type { Speaker } from '../types';

export interface UseSpeakersResult {
  /** All `published && !disabled` speakers, in Firestore order. */
  speakers: Speaker[];
  /** `true` until the initial fetch settles. */
  loading: boolean;
  /** Non-`null` if the fetch failed. */
  error: Error | null;
  /** Re-run the fetch (retry affordance for the error state). */
  reload: () => void;
}

/**
 * Loads the public directory once via {@link getPublishedSpeakers}, wrapped in
 * the `speakers_fetch` performance trace. At MVP scale we fetch all published,
 * non-disabled speakers in a single query and filter in memory (see
 * `lib/filter`). Failures are captured via {@link errorTracker} and surfaced
 * through {@link UseSpeakersResult.error} with a {@link UseSpeakersResult.reload}
 * retry. Never throws.
 */
export function useSpeakers(): UseSpeakersResult {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    measureTrace('speakers_fetch', () => getPublishedSpeakers())
      .then((next) => {
        if (cancelled) return;
        setSpeakers(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const normalized = err instanceof Error ? err : new Error(String(err));
        errorTracker.captureException(normalized, { context: 'useSpeakers' });
        setError(normalized);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return useMemo(
    () => ({ speakers, loading, error, reload }),
    [speakers, loading, error, reload],
  );
}
