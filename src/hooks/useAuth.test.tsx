import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { AuthProvider, useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut,
  GoogleAuthProvider: mocks.GoogleAuthProvider,
}));

// Avoid initializing the real Firebase app.
vi.mock('../lib/firebase', () => ({ auth: {} }));

const fakeUser = { uid: 'user-123' } as User;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fire immediately with a signed-in user.
    mocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return vi.fn();
    });
  });

  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
  });

  it('exposes the signed-in user and clears loading', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(fakeUser);
  });

  it('reflects the signed-out state', async () => {
    mocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('calls signInWithPopup via signInWithGoogle', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mocks.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(mocks.GoogleAuthProvider).toHaveBeenCalledTimes(1);
  });

  it('calls firebase signOut via signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes the listener on unmount', () => {
    const unsubscribe = vi.fn();
    mocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return unsubscribe;
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
