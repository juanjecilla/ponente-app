import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth, type AuthContextValue } from '../../hooks/useAuth';
import '../../i18n';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

function setAuth(partial: Partial<AuthContextValue>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    ...partial,
  });
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when authenticated', () => {
    setAuth({ user: { uid: 'abc' } as User });
    renderAt('/profile/edit');
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    setAuth({ user: null });
    renderAt('/profile/edit');
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows a loading indicator while auth resolves', () => {
    setAuth({ loading: true });
    renderAt('/profile/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
