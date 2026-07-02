import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCitySearch } from '../../hooks/useCitySearch';
import { cityTierToken } from '../../lib/city';
import type { CityResult, CityAvailability } from '../../lib/city';
import { COST_TIERS } from '../../constants/tiers';
import type { CostTier } from '../../constants/tiers';

export interface CityAvailabilityInputProps {
  /** Cities already added (controlled). */
  value?: CityAvailability[];
  /** Called with the next list when a city is added or removed. */
  onChange?: (cities: CityAvailability[]) => void;
  /** Whether live Photon autocomplete is enabled. Defaults to true. */
  enabled?: boolean;
}

/**
 * Search-as-you-type city picker (Photon, debounced + cached + abortable, with
 * a static fallback) plus a cost-tier picker. Yields
 * `CityAvailability { name, key, lat, lng, tier }` entries.
 *
 * Combobox follows the WAI-ARIA pattern: `aria-activedescendant`, arrow/enter/
 * escape keys, and an `aria-live` result count.
 */
export function CityAvailabilityInput({
  value = [],
  onChange,
  enabled = true,
}: CityAvailabilityInputProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CityResult | null>(null);
  const [tier, setTier] = useState<CostTier>('free');
  const [activeIndex, setActiveIndex] = useState(-1);

  const { results, loading, usedFallback } = useCitySearch(
    selected ? '' : query,
    enabled,
  );

  const ids = useId();
  const listboxId = `${ids}-listbox`;
  const optionId = (i: number) => `${ids}-option-${i}`;

  const existingTokens = useMemo(
    () => new Set(value.map((c) => cityTierToken(c.key, c.tier))),
    [value],
  );

  const open = !selected && results.length > 0;

  const chooseCity = (city: CityResult) => {
    setSelected(city);
    setQuery(city.name);
    setActiveIndex(-1);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setActiveIndex(-1);
  };

  const addCity = () => {
    if (!selected) return;
    const token = cityTierToken(selected.key, tier);
    if (existingTokens.has(token)) return; // no duplicate key:tier
    onChange?.([...value, { ...selected, tier }]);
    setSelected(null);
    setQuery('');
    setTier('free');
  };

  const removeCity = (token: string) => {
    onChange?.(value.filter((c) => cityTierToken(c.key, c.tier) !== token));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      clearSelection();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      const active = results.at(activeIndex);
      if (active) {
        e.preventDefault();
        chooseCity(active);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`${ids}-input`}
          className="block text-sm font-medium text-slate-700"
        >
          {t('city.searchLabel')}
        </label>
        <input
          id={`${ids}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          autoComplete="off"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          placeholder={t('city.searchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />

        <p className="sr-only" aria-live="polite">
          {loading
            ? t('city.loading')
            : t('city.resultsCount', { count: results.length })}
        </p>

        {usedFallback && (
          <p className="mt-1 text-xs text-amber-700">
            {t('city.offlineNotice')}
          </p>
        )}

        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('city.searchLabel')}
          className={open ? 'mt-1 rounded border border-slate-200' : 'hidden'}
        >
          {results.map((city, i) => (
            // Keyboard interaction lives on the combobox input (WAI-ARIA
            // aria-activedescendant pattern); options are pointer affordances.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={`${city.key}-${city.lat}-${city.lng}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`cursor-pointer px-3 py-2 ${
                i === activeIndex ? 'bg-indigo-100' : ''
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => chooseCity(city)}
            >
              {city.name}
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <fieldset className="rounded border border-slate-200 p-3">
          <legend className="text-sm font-medium text-slate-700">
            {t('city.tierLabel')}
          </legend>
          <div className="mt-2 space-y-1">
            {COST_TIERS.map((tierOption) => (
              <label key={tierOption} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${ids}-tier`}
                  value={tierOption}
                  checked={tier === tierOption}
                  onChange={() => setTier(tierOption)}
                />
                <span>{t(`city.tier.${tierOption}`)}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-1 text-white"
              onClick={addCity}
            >
              {t('city.add')}
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1"
              onClick={clearSelection}
            >
              {t('city.cancel')}
            </button>
          </div>
        </fieldset>
      )}

      {value.length > 0 && (
        <ul aria-label={t('city.added')} className="space-y-1">
          {value.map((city) => {
            const token = cityTierToken(city.key, city.tier);
            return (
              <li
                key={token}
                className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
              >
                <span>
                  {city.name} — {t(`city.tier.${city.tier}`)}
                </span>
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => removeCity(token)}
                >
                  {t('city.remove', { name: city.name })}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CityAvailabilityInput;
