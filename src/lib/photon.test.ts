import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchCities,
  featureToCity,
  loadStaticCities,
  __resetStaticCitiesCache,
} from './photon';

const madridFeature = {
  properties: { name: 'Madrid', state: 'Madrid', country: 'Spain' },
  geometry: { coordinates: [-3.7038, 40.4168] },
};

function mockFetchJson(json: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(json),
  });
}

beforeEach(() => {
  __resetStaticCitiesCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('featureToCity', () => {
  it('maps a Photon feature to a CityResult', () => {
    expect(featureToCity(madridFeature)).toEqual({
      name: 'Madrid, Madrid, Spain',
      key: 'madrid',
      lat: 40.4168,
      lng: -3.7038,
    });
  });

  it('joins only present name parts', () => {
    const city = featureToCity({
      properties: { name: 'Lisbon', country: 'Portugal' },
      geometry: { coordinates: [-9.1393, 38.7223] },
    });
    expect(city?.name).toBe('Lisbon, Portugal');
  });

  it('returns null without a name', () => {
    expect(featureToCity({ geometry: { coordinates: [0, 0] } })).toBeNull();
  });

  it('returns null without coordinates', () => {
    expect(featureToCity({ properties: { name: 'Madrid' } })).toBeNull();
  });

  it('returns null with non-numeric coordinates', () => {
    expect(
      featureToCity({
        properties: { name: 'Madrid' },
        geometry: { coordinates: [] },
      }),
    ).toBeNull();
  });
});

describe('searchCities', () => {
  it('calls Photon with the right query params and maps results', async () => {
    const fetchMock = mockFetchJson({ features: [madridFeature] });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchCities('madrid');

    expect(results).toHaveLength(1);
    expect(results[0]?.key).toBe('madrid');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('https://photon.komoot.io/api');
    expect(url).toContain('q=madrid');
    expect(url).toContain('limit=6');
    expect(url).toContain('lang=en');
    expect(url).toContain('osm_tag=place%3Acity');
    expect(url).toContain('osm_tag=place%3Atown');
  });

  it('forwards the abort signal to fetch', async () => {
    const fetchMock = mockFetchJson({ features: [] });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await searchCities('x', controller.signal);

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      signal: controller.signal,
    });
  });

  it('drops unusable features', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchJson({ features: [madridFeature, { properties: {} }] }),
    );
    expect(await searchCities('madrid')).toHaveLength(1);
  });

  it('tolerates a missing features array', async () => {
    vi.stubGlobal('fetch', mockFetchJson({}));
    expect(await searchCities('nothing')).toEqual([]);
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetchJson({}, false, 503));
    await expect(searchCities('madrid')).rejects.toThrow('Photon 503');
  });
});

describe('loadStaticCities', () => {
  it('fetches, parses and caches the fallback list', async () => {
    const list = [{ name: 'Madrid, Spain', key: 'madrid', lat: 40, lng: -3 }];
    const fetchMock = mockFetchJson(list);
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadStaticCities();
    const second = await loadStaticCities();

    expect(first).toEqual(list);
    expect(second).toBe(first); // cached, not re-fetched
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetchJson({}, false, 404));
    await expect(loadStaticCities()).rejects.toThrow('Static cities 404');
  });
});
