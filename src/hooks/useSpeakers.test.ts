import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Timestamp } from 'firebase/firestore';
import { useSpeakers } from './useSpeakers';
import { getPublishedSpeakers } from '../lib/firestore';
import { errorTracker } from '../lib/error-tracker';
import type { Speaker } from '../types';

vi.mock('../lib/firestore', () => ({ getPublishedSpeakers: vi.fn() }));
vi.mock('../lib/perf', () => ({
  measureTrace: (_name: string, fn: () => unknown) => fn(),
}));
vi.mock('../lib/error-tracker', () => ({
  errorTracker: { captureException: vi.fn() },
}));

const mockedFetch = vi.mocked(getPublishedSpeakers);
const mockedCapture = vi.mocked(errorTracker.captureException);

const ts = {} as Timestamp;
const speaker: Speaker = {
  uid: 's1',
  name: 'Ada',
  topics: ['android'],
  cities: [],
  cityTierTokens: [],
  contactLinks: [],
  gdeVerified: false,
  published: true,
  disabled: false,
  createdAt: ts,
  updatedAt: ts,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSpeakers', () => {
  it('loads published speakers', async () => {
    mockedFetch.mockResolvedValue([speaker]);
    const { result } = renderHook(() => useSpeakers());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.speakers).toEqual([speaker]);
    expect(result.current.error).toBeNull();
  });

  it('captures and surfaces a fetch error', async () => {
    mockedFetch.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSpeakers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.speakers).toEqual([]);
    expect(mockedCapture).toHaveBeenCalledTimes(1);
  });

  it('re-fetches on reload', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('boom'));
    mockedFetch.mockResolvedValueOnce([speaker]);
    const { result } = renderHook(() => useSpeakers());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.speakers).toEqual([speaker]));
    expect(result.current.error).toBeNull();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
