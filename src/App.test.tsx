import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import './i18n';

// Keep AuthProvider's onAuthStateChanged from touching real Firebase.
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return vi.fn();
  }),
  signInWithPopup: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: vi.fn(),
}));
vi.mock('./lib/firebase', () => ({ auth: {}, app: {}, db: {} }));
// The home route renders the public directory; stub its data access so the tree
// mounts without touching Firestore.
vi.mock('./lib/firestore', () => ({
  getPublishedSpeakers: vi.fn(() => Promise.resolve([])),
  getSpeaker: vi.fn(() => Promise.resolve(null)),
  fetchTags: vi.fn(() => Promise.resolve([])),
  createReport: vi.fn(),
  createTagRequest: vi.fn(),
}));
// The profile route also pulls firestore.ts collection refs at import; stub
// collection().withConverter() so any direct firebase/firestore use is safe too.
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn(() => ({ withConverter: () => ({}) })),
  };
});

describe('App', () => {
  it('renders the directory heading at "/"', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /speaker directory/i }),
    ).toBeInTheDocument();
  });

  it('renders the shared header with the language switcher on every page', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: /speaker directory/i });
    expect(
      screen.getByRole('link', { name: /ponente home/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /language/i }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: /speaker directory/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
