import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { CityOption, SpeakerFilterState } from '../../lib/filter';
import { COST_TIERS } from '../../constants/tiers';
import type { CostTier } from '../../types';
import type { SpeakerFilterType } from '../../lib/analytics';

export interface SpeakerFiltersProps {
  state: SpeakerFilterState;
  /**
   * Called with the next filter state and the facet that changed (for the
   * debounced `speaker_searched` analytics event, fired by the parent).
   */
  onChange: (next: SpeakerFilterState, facet: SpeakerFilterType) => void;
  /** Distinct cities present across the loaded speakers. */
  cityOptions: CityOption[];
  /** Distinct topic slugs present across the loaded speakers. */
  topicSlugs: string[];
  /** Resolves a topic slug to a localized label (from `useTags`). */
  topicLabel: (slug: string) => string;
  /** Number of speakers matching the current filter (announced politely). */
  resultCount: number;
}

/** Toggles `value` in/out of an array without mutating the original. */
function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/**
 * Faceted directory filters: city, topic (labels via `useTags`) and cost tier,
 * each a checkbox group. Fully controlled. Exposes a "clear filters" action and
 * an `aria-live` result count so screen-reader users hear how many speakers
 * match as they refine.
 */
export function SpeakerFilters({
  state,
  onChange,
  cityOptions,
  topicSlugs,
  topicLabel,
  resultCount,
}: SpeakerFiltersProps) {
  const { t } = useTranslation();
  const ids = useId();

  const hasFilters =
    state.cityKeys.length > 0 ||
    state.tiers.length > 0 ||
    state.topics.length > 0;

  return (
    <section aria-label={t('directory.filters.title')} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {t('directory.filters.title')}
        </h2>
        {hasFilters && (
          <button
            type="button"
            className="text-sm text-indigo-600 underline"
            onClick={() =>
              onChange(
                { ...state, cityKeys: [], tiers: [], topics: [] },
                'city',
              )
            }
          >
            {t('directory.filters.clear')}
          </button>
        )}
      </div>

      {cityOptions.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-slate-600">
            {t('directory.filters.city')}
          </legend>
          <ul className="mt-2 flex flex-wrap gap-2">
            {cityOptions.map((city) => {
              const inputId = `${ids}-city-${city.key}`;
              return (
                <li key={city.key}>
                  <label
                    htmlFor={inputId}
                    className="flex items-center gap-2 rounded border border-slate-300 px-3 py-1 text-sm"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={state.cityKeys.includes(city.key)}
                      onChange={() =>
                        onChange(
                          {
                            ...state,
                            cityKeys: toggle(state.cityKeys, city.key),
                          },
                          'city',
                        )
                      }
                    />
                    <span>{city.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {topicSlugs.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-slate-600">
            {t('directory.filters.topic')}
          </legend>
          <ul className="mt-2 flex flex-wrap gap-2">
            {topicSlugs.map((slug) => {
              const inputId = `${ids}-topic-${slug}`;
              return (
                <li key={slug}>
                  <label
                    htmlFor={inputId}
                    className="flex items-center gap-2 rounded border border-slate-300 px-3 py-1 text-sm"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={state.topics.includes(slug)}
                      onChange={() =>
                        onChange(
                          { ...state, topics: toggle(state.topics, slug) },
                          'topic',
                        )
                      }
                    />
                    <span>{topicLabel(slug)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-slate-600">
          {t('directory.filters.tier')}
        </legend>
        <ul className="mt-2 flex flex-wrap gap-2">
          {COST_TIERS.map((tier: CostTier) => {
            const inputId = `${ids}-tier-${tier}`;
            return (
              <li key={tier}>
                <label
                  htmlFor={inputId}
                  className="flex items-center gap-2 rounded border border-slate-300 px-3 py-1 text-sm"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={state.tiers.includes(tier)}
                    onChange={() =>
                      onChange(
                        { ...state, tiers: toggle(state.tiers, tier) },
                        'tier',
                      )
                    }
                  />
                  <span>{t(`directory.tier.${tier}`)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p aria-live="polite" className="text-sm text-slate-500">
        {t('directory.resultCount', { count: resultCount })}
      </p>
    </section>
  );
}

export default SpeakerFilters;
