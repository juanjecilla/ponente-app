# Task 05: City Search (Photon) + Tier Picker

**Phase:** 3
**Estimated Effort:** 3 hours
**Dependencies:** 01
**Replaces:** the old Nominatim autocomplete task — see ADR 0003.

---

## Context

City availability is the core differentiator. **Nominatim prohibits autocomplete** (and caps at 1 req/s total), so city search uses **Photon** (komoot), which explicitly supports search-as-you-type, is free, and needs no key. A static curated list is the offline fallback and the `enable_city_autocomplete=false` path.

## Goal

A `<CityAvailabilityInput>` that lets a speaker search a city (Photon, debounced + cached), pick a cost tier, and add multiple `{name, key, lat, lng, tier}` entries. Same search powers the directory's city filter so canonical keys match.

---

## Implementation Steps

### 5.1 Photon client — `src/lib/photon.ts`
```typescript
const BASE = 'https://photon.komoot.io/api';

export interface CityResult { name: string; key: string; lat: number; lng: number; }

export async function searchCities(q: string, signal?: AbortSignal): Promise<CityResult[]> {
  const params = new URLSearchParams({ q, limit: '6', lang: 'en' });
  ['place:city', 'place:town'].forEach((t) => params.append('osm_tag', t));
  const res = await fetch(`${BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = await res.json();
  return json.features.map((f: any) => {
    const p = f.properties;
    const display = [p.name, p.state, p.country].filter(Boolean).join(', ');
    return {
      name: display,
      key: normalizeCityKey(p.name),
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    };
  });
}
```

### 5.2 Normalization — `src/lib/city.ts`
```typescript
export const normalizeCityKey = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
      .toLowerCase().trim().replace(/\s+/g, '-');        // "São Paulo" → "sao-paulo"
```
Used for both stored `key` and filter matching so `"Madrid"`, `"Madrid, Spain"`, `"MADRID"` collapse.

### 5.3 Hook — `src/hooks/useCitySearch.ts`
- Debounce ≥300 ms; `AbortController` cancels in-flight on new input.
- In-memory `Map<string, CityResult[]>` cache keyed by normalized query.
- On Photon error or `enable_city_autocomplete=false`: load `public/data/cities.json` and fuzzy-filter client-side.
- Wrap the fetch in the `speakers_fetch`-style perf pattern? No — Photon is auto-traced (task 15); no custom trace needed.

### 5.4 Component — `src/components/profile/CityAvailabilityInput.tsx`
- Combobox (input + listbox) with full keyboard support (`aria-activedescendant`, arrow/enter/escape).
- On select: show tier picker (`free|self-covered|needs-expenses`, from `src/constants/tiers.ts`).
- Add to `cities[]`; list added cities with their tier + remove button. Prevent duplicate `key:tier`.

### 5.5 Static fallback — `public/data/cities.json`
Curated GeoNames cities (population > 15k) for ES + EU, shape `{name, key, lat, lng}`. Keep it lean (bundle weight). Document the regen source in a comment/README.

---

## Corner Cases & Gotchas
- **Fair-use:** debounce + cache + abort are mandatory; Photon throttles heavy use and gives no uptime guarantee (ADR 0003). Never fire per-keystroke without debounce.
- **No results / network down:** fall back to static list; if still nothing, allow manual free-text city (store `key` from normalize, `lat/lng` as null-ish — but directory map features assume coords; for MVP, require a picked result OR mark coordinates optional and skip map use).
- **Key collisions:** different cities sharing a name (e.g. multiple "Springfield") — include state/country in `name` for display; `key` may collide, acceptable at MVP (filter is by city name intent).
- **Accents/locale:** always normalize before compare; test "Málaga"/"Malaga", "São Paulo".
- **Race conditions:** out-of-order responses — abort previous request; ignore responses whose query != current input.
- **CORS:** Photon public API sends permissive CORS; if it ever changes, the static fallback covers it.
- **a11y:** combobox pattern per WAI-ARIA; announce result count via `aria-live`.

## Definition of Done
- [ ] Typing a city queries Photon (debounced, cached, abortable) and lists results.
- [ ] Selecting a city + tier adds a `{name,key,lat,lng,tier}` entry; duplicates prevented.
- [ ] `normalizeCityKey` collapses accents/case/spacing; unit-tested.
- [ ] Fallback to `public/data/cities.json` works when Photon fails or flag off.
- [ ] Same client reused by the directory city filter (task 08).
- [ ] Combobox is keyboard + screen-reader accessible (axe clean).
