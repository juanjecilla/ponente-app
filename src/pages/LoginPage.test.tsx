import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
  type InitialEntry,
} from 'react-router-dom';
import type { User } from 'firebase/auth';
import { LoginPage } from './LoginPage';
import { useAuth, type AuthContextValue } from '../hooks/useAuth';
import '../i18n';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const signInWithGoogle = vi.fn(() => Promise.resolve());

function setAuth(partial: Partial<AuthContextValue>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    signInWithGoogle,
    signOut: vi.fn(),
    ...partial,
  });
}

function renderLogin(initialEntry: InitialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile/edit" element={<div>Profile edit</div>} />
        <Route path="/speaker/:uid" element={<div>Speaker page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ user: null });
  });

  it('renders the sign-in button and copy', () => {
    renderLogin();
    expect(
      screen.getByRole('heading', { name: /sign in to ponente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in with google/i }),
    ).toBeInTheDocument();
  });

  it('calls signInWithGoogle when the button is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i }),
    );
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('redirects to the default route after sign-in', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(
      screen.getByRole('button', { name: /sign in with google/i }),
    );
    expect(await screen.findByText('Profile edit')).toBeInTheDocument();
  });

  it('redirects an already-authenticated user to the intended path', () => {
    setAuth({ user: { uid: 'abc' } as User });
    renderLogin({
      pathname: '/login',
      state: { from: { pathname: '/speaker/42' } },
    });
    expect(screen.getByText('Speaker page')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLogin();
    expect(await axe(container)).toHaveNoViolations();
  });
});
