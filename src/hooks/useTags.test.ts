import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Timestamp } from 'firebase/firestore';
import type { TagWithSlug } from '../lib/firestore';

const { getDocsMock } = vi.hoisted(() => ({ getDocsMock: vi.fn() }));

vi.mock('../lib/firebase', () => ({ db: {}, app: {}, auth: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ withConverter: vi.fn(() => ({})) })),
  doc: vi.fn(() => ({ withConverter: vi.fn(() => ({})) })),
  getDoc: vi.fn(),
  getDocs: getDocsMock,
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

import { useTags, resolveTagLabel } from './useTags';

const ts = {} as Timestamp;

function snapshotOf(entries: Array<{ id: string; data: unknown }>) {
  return {
    docs: entries.map((e) => ({ id: e.id, data: () => e.data })),
  };
}

const sampleTags: TagWithSlug[] = [
  { slug: 'android', label: { en: 'Android', es: 'Android' }, createdAt: ts },
  { slug: 'ai-ml', label: { en: 'AI/ML', es: 'IA/ML' }, createdAt: ts },
];

beforeEach(() => {
  getDocsMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTags', () => {
  it('starts in a loading state', () => {
    getDocsMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTags());
    expect(result.current.loading).toBe(true);
    expect(result.current.tags).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('maps documents to typed tags with the doc id as slug', async () => {
    getDocsMock.mockResolvedValue(
      snapshotOf([
        { id: 'android', data: { label: { en: 'Android', es: 'Android' } } },
        { id: 'ai-ml', data: { label: { en: 'AI/ML', es: 'IA/ML' } } },
      ]),
    );
    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.tags).toHaveLength(2);
    expect(result.current.tags[0]?.slug).toBe('android');
    expect(result.current.tags[1]?.label.es).toBe('IA/ML');
  });

  it('exposes the error when the fetch rejects', async () => {
    getDocsMock.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('offline');
    expect(result.current.tags).toEqual([]);
  });

  it('labelFor returns the localized label', async () => {
    getDocsMock.mockResolvedValue(
      snapshotOf([
        { id: 'android', data: { label: { en: 'Android', es: 'Android' } } },
        { id: 'ai-ml', data: { label: { en: 'AI/ML', es: 'IA/ML' } } },
      ]),
    );
    const { result } = renderHook(() => useTags());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.labelFor('ai-ml', 'en')).toBe('AI/ML');
    expect(result.current.labelFor('ai-ml', 'es-ES')).toBe('IA/ML');
  });
});

describe('resolveTagLabel', () => {
  it('returns the Spanish label for an es locale', () => {
    expect(resolveTagLabel(sampleTags, 'ai-ml', 'es')).toBe('IA/ML');
  });

  it('falls back to English (with a warning) when the es label is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tags: TagWithSlug[] = [
      { slug: 'devops', label: { en: 'DevOps', es: '' }, createdAt: ts },
    ];
    expect(resolveTagLabel(tags, 'devops', 'es')).toBe('DevOps');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('returns the raw slug for an unknown/orphan slug', () => {
    expect(resolveTagLabel(sampleTags, 'quantum', 'en')).toBe('quantum');
  });
});
