import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCitySearch, __resetCitySearchCache } from './useCitySearch';
import { searchCities, loadStaticCities } from '../lib/photon';
import type { CityResult } from '../lib/city';

vi.mock('../lib/photon', () => ({
  searchCities: vi.fn(),
  loadStaticCities: vi.fn(),
}));

const mockedSearch = vi.mocked(searchCities);
const mockedStatic = vi.mocked(loadStaticCities);

const madrid: CityResult = {
  name: 'Madrid, Spain',
  key: 'madrid',
  lat: 40.4,
  lng: -3.7,
};
const malaga: CityResult = {
  name: 'Málaga, Spain',
  key: 'malaga',
  lat: 36.7,
  lng: -4.4,
};

// Flush the debounce timer + any pending microtasks.
async function flush(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockedSearch.mockReset();
  mockedStatic.mockReset();
  __resetCitySearchCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCitySearch', () => {
  it('does not search below the minimum query length', async () => {
    const { result } = renderHook(() => useCitySearch('m'));
    await flush();
    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('debounces before calling Photon', async () => {
    mockedSearch.mockResolvedValue([madrid]);
    const { result } = renderHook(() => useCitySearch('madrid'));

    // Not called before the debounce window elapses.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(mockedSearch).not.toHaveBeenCalled();

    await flush(100);
    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual([madrid]);
    expect(result.current.usedFallback).toBe(false);
  });

  it('caches results by query and does not re-fetch', async () => {
    mockedSearch.mockResolvedValue([madrid]);
    const { rerender } = renderHook(({ q }) => useCitySearch(q), {
      initialProps: { q: 'madrid' },
    });
    await flush();
    expect(mockedSearch).toHaveBeenCalledTimes(1);

    // Switch away then back to the cached query.
    mockedSearch.mockResolvedValue([malaga]);
    rerender({ q: 'malaga' });
    await flush();
    expect(mockedSearch).toHaveBeenCalledTimes(2);

    rerender({ q: 'madrid' });
    await flush();
    // Served from cache — still only two network calls.
    expect(mockedSearch).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight request when the query changes', async () => {
    const signals: AbortSignal[] = [];
    mockedSearch.mockImplementation(async (_q, signal) => {
      if (signal) signals.push(signal);
      return [madrid];
    });

    const { rerender } = renderHook(({ q }) => useCitySearch(q), {
      initialProps: { q: 'mad' },
    });
    // Fire the first request, then change the query mid-flight.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    rerender({ q: 'madr' });
    await flush();

    expect(signals[0]?.aborted).toBe(true);
  });

  it('falls back to the static list when Photon fails', async () => {
    mockedSearch.mockRejectedValue(new Error('Photon 503'));
    mockedStatic.mockResolvedValue([madrid, malaga]);

    const { result } = renderHook(() => useCitySearch('mad'));
    await flush();

    expect(mockedStatic).toHaveBeenCalled();
    expect(result.current.results).toEqual([madrid]);
    expect(result.current.usedFallback).toBe(true);
  });

  it('yields [] when Photon and the fallback both fail', async () => {
    mockedSearch.mockRejectedValue(new Error('Photon 503'));
    mockedStatic.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useCitySearch('mad'));
    await flush();

    expect(result.current.results).toEqual([]);
    expect(result.current.usedFallback).toBe(true);
  });

  it('uses the static list directly when autocomplete is disabled', async () => {
    mockedStatic.mockResolvedValue([madrid, malaga]);
    const { result } = renderHook(() => useCitySearch('mad', false));
    await flush();

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(mockedStatic).toHaveBeenCalled();
    expect(result.current.results).toEqual([madrid]);
    expect(result.current.usedFallback).toBe(false);
  });

  it('ignores an aborted rejection without flagging fallback', async () => {
    // Reject only once the signal is aborted (real Photon/fetch behaviour).
    mockedSearch.mockImplementation(
      (_q, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );

    const { result, rerender } = renderHook(({ q }) => useCitySearch(q), {
      initialProps: { q: 'mad' },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    // Change query -> cleanup aborts the in-flight request, triggering rejection.
    rerender({ q: 'madr' });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.usedFallback).toBe(false);
    expect(mockedStatic).not.toHaveBeenCalled();
  });
});
