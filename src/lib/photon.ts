import { normalizeCityKey } from './city';
import type { CityResult } from './city';

// Photon (komoot) OSM geocoder — free, no key, explicitly supports
// search-as-you-type. Replaces Nominatim (autocomplete prohibited). See ADR 0003.
const BASE = 'https://photon.komoot.io/api';

// URL of the bundled static fallback (served from `public/`).
const STATIC_CITIES_URL = '/data/cities.json';

interface PhotonProperties {
  name?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  properties?: PhotonProperties;
  geometry?: { coordinates?: number[] };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

/** Map a raw Photon GeoJSON feature to a CityResult, or null if unusable. */
export function featureToCity(feature: PhotonFeature): CityResult | null {
  const p = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!p?.name || !coords) return null;
  const lng = coords[0];
  const lat = coords[1];
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const display = [p.name, p.state, p.country].filter(Boolean).join(', ');
  return { name: display, key: normalizeCityKey(p.name), lat, lng };
}

/**
 * Search cities via Photon. Queries `place:city` + `place:town` for small-town
 * coverage, `limit=6`, `lang=en`. Caller supplies an AbortSignal to cancel
 * in-flight requests (fair-use citizen — debounce + abort + cache upstream).
 */
export async function searchCities(
  q: string,
  signal?: AbortSignal,
): Promise<CityResult[]> {
  const params = new URLSearchParams({ q, limit: '6', lang: 'en' });
  for (const tag of ['place:city', 'place:town']) {
    params.append('osm_tag', tag);
  }
  const res = await fetch(`${BASE}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = (await res.json()) as PhotonResponse;
  return (json.features ?? [])
    .map(featureToCity)
    .filter((c): c is CityResult => c !== null);
}

// Cache the fetched fallback list so it is only loaded once per session.
let staticCitiesCache: CityResult[] | null = null;

/** Load the bundled curated fallback list (used when Photon fails or flag off). */
export async function loadStaticCities(): Promise<CityResult[]> {
  if (staticCitiesCache) return staticCitiesCache;
  const res = await fetch(STATIC_CITIES_URL);
  if (!res.ok) throw new Error(`Static cities ${res.status}`);
  const cities = (await res.json()) as CityResult[];
  staticCitiesCache = cities;
  return cities;
}

// Test-only: reset the module-level fallback cache between cases.
export function __resetStaticCitiesCache(): void {
  staticCitiesCache = null;
}
