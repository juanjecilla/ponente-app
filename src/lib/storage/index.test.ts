import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PhotoStorageBackend } from '../remote-config';

// Mock Remote Config and both SDK-backed providers so this unit test never
// touches a storage SDK or the network — only the selector logic runs. The
// stubs live in `vi.hoisted` because `vi.mock` factories are hoisted above
// module-level declarations.
const { getBackendMock, supabaseStorage, firebaseStorage } = vi.hoisted(() => ({
  getBackendMock: vi.fn(),
  supabaseStorage: { uploadPhoto: vi.fn(), deletePhoto: vi.fn() },
  firebaseStorage: { uploadPhoto: vi.fn(), deletePhoto: vi.fn() },
}));

vi.mock('../remote-config', () => ({ getPhotoStorageBackend: getBackendMock }));
vi.mock('./supabase', () => ({ supabaseStorage }));
vi.mock('./firebase', () => ({ firebaseStorage }));

import { getStorageProvider } from './index';

const setBackend = (backend: PhotoStorageBackend) =>
  getBackendMock.mockReturnValue(backend);

beforeEach(() => {
  getBackendMock.mockReset();
});

describe('getStorageProvider', () => {
  it('returns the Supabase provider by default', () => {
    setBackend('supabase');
    expect(getStorageProvider()).toBe(supabaseStorage);
  });

  it('returns the Firebase provider when the flag selects firebase', () => {
    setBackend('firebase');
    expect(getStorageProvider()).toBe(firebaseStorage);
  });

  it('reads the flag on every call so a flag flip switches backend', () => {
    setBackend('supabase');
    expect(getStorageProvider()).toBe(supabaseStorage);
    setBackend('firebase');
    expect(getStorageProvider()).toBe(firebaseStorage);
  });
});
