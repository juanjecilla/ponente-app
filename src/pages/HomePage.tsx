import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpeakers } from '../hooks/useSpeakers';
import { useTags } from '../hooks/useTags';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import {
  deriveCityOptions,
  deriveTopicSlugs,
  EMPTY_FILTER,
  filterSpeakers,
  type SpeakerFilterState,
} from '../lib/filter';
import {
  trackExperimentExposure,
  trackSpeakerSearched,
  type SpeakerFilterType,
} from '../lib/analytics';
import { SpeakerFilters } from '../components/directory/SpeakerFilters';
import { SpeakerGrid } from '../components/directory/SpeakerGrid';
import { SpeakerList } from '../components/directory/SpeakerList';

/** Debounce window for the `speaker_searched` analytics event (ms). */
const SEARCH_DEBOUNCE_MS = 600;

/** Remote Config A/B experiment id for the grid-vs-list layout test (task 18). */
const DIRECTORY_LAYOUT_EXPERIMENT = 'directory_layout_test';

/**
 * Public speaker directory (`/`). Fetches every published speaker once, filters
 * in memory by city / topic / cost tier, and renders the grid or list layout
 * chosen by the `directory_layout` A/B flag (default grid). Handles loading,
 * error (with retry), empty-directory and no-match states, and is gated by
 * `enable_public_directory`.
 */
export function HomePage() {
  const { t, i18n } = useTranslation();
  const { flags, loading: configLoading } = useRemoteConfig();
  const { speakers, loading, error, reload } = useSpeakers();
  const { labelFor } = useTags();

  const [filter, setFilter] = useState<SpeakerFilterState>(EMPTY_FILTER);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exposureLoggedRef = useRef(false);

  const topicLabel = useCallback(
    (slug: string) => labelFor(slug, i18n.language),
    [labelFor, i18n.language],
  );

  const cityOptions = useMemo(() => deriveCityOptions(speakers), [speakers]);
  const topicSlugs = useMemo(() => deriveTopicSlugs(speakers), [speakers]);
  const filtered = useMemo(
    () => filterSpeakers(speakers, filter),
    [speakers, filter],
  );

  useEffect(
    () => () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Log the directory_layout A/B variant once the Remote Config fetch settles,
  // exactly once per mount, so grid vs list can be compared against the
  // `speaker_profile_viewed` goal metric. Gated on the directory being enabled
  // (a hidden directory never renders a layout, so exposure is meaningless).
  useEffect(() => {
    if (configLoading || exposureLoggedRef.current) return;
    if (!flags.enable_public_directory) return;
    exposureLoggedRef.current = true;
    trackExperimentExposure({
      experiment: DIRECTORY_LAYOUT_EXPERIMENT,
      variant: flags.directory_layout,
    });
  }, [configLoading, flags.enable_public_directory, flags.directory_layout]);

  const handleFilterChange = useCallback(
    (next: SpeakerFilterState, facet: SpeakerFilterType) => {
      setFilter(next);
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        trackSpeakerSearched({ filterType: facet });
      }, SEARCH_DEBOUNCE_MS);
    },
    [],
  );

  if (!flags.enable_public_directory) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('directory.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('directory.disabled')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t('directory.title')}
        </h1>
        <p className="mt-2 text-slate-600">{t('directory.subtitle')}</p>
      </header>

      {loading && (
        <div
          aria-live="polite"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <span className="sr-only">{t('directory.loading')}</span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
        >
          <p className="text-red-700">{t('directory.error')}</p>
          <button
            type="button"
            className="mt-3 rounded bg-indigo-600 px-4 py-2 text-white"
            onClick={reload}
          >
            {t('directory.retry')}
          </button>
        </div>
      )}

      {!loading && !error && speakers.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700">{t('directory.empty')}</p>
        </div>
      )}

      {!loading && !error && speakers.length > 0 && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
          <aside>
            <SpeakerFilters
              state={filter}
              onChange={handleFilterChange}
              cityOptions={cityOptions}
              topicSlugs={topicSlugs}
              topicLabel={topicLabel}
              resultCount={filtered.length}
            />
          </aside>

          <div>
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
                {t('directory.emptyFilters')}
              </p>
            ) : flags.directory_layout === 'list' ? (
              <SpeakerList speakers={filtered} topicLabel={topicLabel} />
            ) : (
              <SpeakerGrid speakers={filtered} topicLabel={topicLabel} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default HomePage;
