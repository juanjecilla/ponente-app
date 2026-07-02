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
vi.mock('./lib/firebase', () => ({ auth: {} }));

describe('App', () => {
  it('renders the home page hero at "/"', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /ponente/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/travel to your city/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
