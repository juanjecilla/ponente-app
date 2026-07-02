import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CityAvailability, Speaker } from '../types';

// Mock the Firebase app/db so importing firestore.ts has no side effects.
vi.mock('./firebase', () => ({ db: { __mock: 'db' } }));

// Mock the modular Firestore SDK. `collection` returns an object exposing
// `withConverter` so the module-level typed refs build without a real SDK.
const getDoc = vi.fn();
const getDocs = vi.fn();
const setDoc = vi.fn();
const updateDoc = vi.fn();
const addDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({
    type: 'collection',
    name,
    withConverter: (converter: unknown) => ({
      type: 'collection',
      name,
      converter,
    }),
  })),
  doc: vi.fn((_db: unknown, name: string, id: string) => ({
    type: 'doc',
    name,
    id,
    withConverter: (converter: unknown) => ({
      type: 'doc',
      name,
      id,
      converter,
    }),
  })),
  query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({
    type: 'query',
    ref,
    constraints,
  })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  getDoc: (...args: unknown[]) => getDoc(...args),
  getDocs: (...args: unknown[]) => getDocs(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
  addDoc: (...args: unknown[]) => addDoc(...args),
}));

import {
  createReport,
  createTagRequest,
  deriveCityTierTokens,
  getPublishedSpeakers,
  getSpeaker,
  isPublishReady,
  normalizeCityKey,
  reportConverter,
  speakerConverter,
  upsertSpeaker,
} from './firestore';

const city = (over: Partial<CityAvailability> = {}): CityAvailability => ({
  name: 'Madrid, Spain',
  key: 'madrid',
  lat: 40.4,
  lng: -3.7,
  tier: 'free',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deriveCityTierTokens', () => {
  it('derives `${key}:${tier}` tokens', () => {
    expect(
      deriveCityTierTokens([
        city({ key: 'madrid', tier: 'free' }),
        city({ key: 'lisbon', tier: 'needs-expenses' }),
      ]),
    ).toEqual(['madrid:free', 'lisbon:needs-expenses']);
  });

  it('returns an empty array for no cities', () => {
    expect(deriveCityTierTokens([])).toEqual([]);
  });
});

describe('normalizeCityKey', () => {
  it('lowercases, strips accents and slugifies', () => {
    expect(normalizeCityKey('Málaga')).toBe('malaga');
    expect(normalizeCityKey('São Paulo')).toBe('sao-paulo');
  });

  it('uses only the city segment before the first comma', () => {
    expect(normalizeCityKey('Madrid, Spain')).toBe('madrid');
  });

  it('collapses punctuation/whitespace and trims hyphens', () => {
    expect(normalizeCityKey("  A Coruña / O'Higgins  ")).toBe(
      'a-coruna-o-higgins',
    );
  });

  it('handles an empty string', () => {
    expect(normalizeCityKey('')).toBe('');
  });
});

describe('isPublishReady', () => {
  const ready: Partial<Speaker> = {
    name: 'Ada',
    topics: ['web'],
    cities: [city()],
    contactLinks: [{ type: 'email', value: 'a@b.co' }],
  };

  it('accepts a complete profile', () => {
    expect(isPublishReady(ready)).toBe(true);
  });

  it('rejects when any required field is missing/empty', () => {
    expect(isPublishReady({ ...ready, name: '' })).toBe(false);
    expect(isPublishReady({ ...ready, topics: [] })).toBe(false);
    expect(isPublishReady({ ...ready, cities: [] })).toBe(false);
    expect(isPublishReady({ ...ready, contactLinks: [] })).toBe(false);
    expect(isPublishReady({})).toBe(false);
  });
});

describe('converters', () => {
  it('fromFirestore returns the snapshot data typed', () => {
    const data = { uid: 'x', name: 'Ada' };
    const snap = { data: () => data } as never;
    expect(speakerConverter.fromFirestore(snap)).toBe(data);
  });

  it('toFirestore passes the model through', () => {
    const model = {
      reportedUid: 'x',
      reportedBy: 'y',
      reason: 'spam',
    } as never;
    expect(reportConverter.toFirestore(model)).toBe(model);
  });
});

describe('getSpeaker', () => {
  it('returns data when the doc exists', async () => {
    const data = { uid: 'u1', name: 'Ada' };
    getDoc.mockResolvedValue({ exists: () => true, data: () => data });
    await expect(getSpeaker('u1')).resolves.toBe(data);
  });

  it('returns null when the doc is missing', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await expect(getSpeaker('u1')).resolves.toBeNull();
  });
});

describe('upsertSpeaker', () => {
  it('creates with safe admin defaults when absent', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await upsertSpeaker('u1', { name: 'Ada', published: true });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const payload = setDoc.mock.calls[0]![1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      uid: 'u1',
      disabled: false,
      gdeVerified: false,
      name: 'Ada',
      published: true,
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('updates without clobbering createdAt when present', async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    await upsertSpeaker('u1', { bio: 'hi' });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const payload = updateDoc.mock.calls[0]![1] as Record<string, unknown>;
    expect(payload).toEqual({ bio: 'hi', updatedAt: 'SERVER_TS' });
    expect(payload).not.toHaveProperty('createdAt');
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe('getPublishedSpeakers', () => {
  it('maps snapshot docs to their data', async () => {
    const s1 = { uid: 'a' };
    const s2 = { uid: 'b' };
    getDocs.mockResolvedValue({
      docs: [{ data: () => s1 }, { data: () => s2 }],
    });
    await expect(getPublishedSpeakers()).resolves.toEqual([s1, s2]);
  });
});

describe('createTagRequest', () => {
  it('adds a pending request with a server timestamp', async () => {
    await createTagRequest({ tag: 'rust', requestedBy: 'u1' });
    const payload = addDoc.mock.calls[0]![1] as Record<string, unknown>;
    expect(payload).toEqual({
      tag: 'rust',
      requestedBy: 'u1',
      status: 'pending',
      createdAt: 'SERVER_TS',
    });
  });
});

describe('createReport', () => {
  it('adds a report with a server timestamp', async () => {
    await createReport({
      reportedUid: 'u2',
      reportedBy: 'u1',
      reason: 'spam',
    });
    const payload = addDoc.mock.calls[0]![1] as Record<string, unknown>;
    expect(payload).toEqual({
      reportedUid: 'u2',
      reportedBy: 'u1',
      reason: 'spam',
      createdAt: 'SERVER_TS',
    });
  });
});
