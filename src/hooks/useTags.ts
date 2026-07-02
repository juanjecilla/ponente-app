import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTags, type TagWithSlug } from '../lib/firestore';

export interface UseTagsResult {
  /** The taxonomy, each tag carrying its slug (document id). */
  tags: TagWithSlug[];
  /** `true` until the initial fetch settles. */
  loading: boolean;
  /** Non-`null` if the fetch failed. */
  error: Error | null;
  /**
   * Resolves a slug to a display label in the given i18n locale, falling back
   * to English (with a warning) when a translation is missing, and to the raw
   * slug for unknown/orphan slugs — never renders `undefined`.
   */
  labelFor: (slug: string, locale: string) => string;
}

/**
 * Pure slug → label resolver. Kept separate from the hook so it can be reused
 * and unit-tested without React. Avoids dynamic object indexing to satisfy the
 * `security/detect-object-injection` lint rule.
 */
export function resolveTagLabel(
  tags: TagWithSlug[],
  slug: string,
  locale: string,
): string {
  const tag = tags.find((t) => t.slug === slug);
  if (tag === undefined) return slug; // unknown/orphan slug → show the raw slug
  const wantsSpanish = locale.startsWith('es');
  if (wantsSpanish) {
    if (tag.label.es) return tag.label.es;
    console.warn(
      `[useTags] Tag "${slug}" has no "es" label; falling back to "en".`,
    );
  }
  return tag.label.en || slug;
}

/**
 * Loads the dynamic `tags` Firestore taxonomy once on mount and exposes it as
 * typed {@link TagWithSlug}s plus loading/error state and a {@link labelFor}
 * translator. Topics are never hardcoded — admins add tags without a redeploy.
 */
export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<TagWithSlug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTags()
      .then((next) => {
        if (cancelled) return;
        setTags(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const labelFor = useCallback(
    (slug: string, locale: string) => resolveTagLabel(tags, slug, locale),
    [tags],
  );

  return useMemo(
    () => ({ tags, loading, error, labelFor }),
    [tags, loading, error, labelFor],
  );
}
