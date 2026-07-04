import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { ProfileEditPage } from './ProfileEditPage';
import { useAuth, type AuthContextValue } from '../hooks/useAuth';
import '../i18n';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
// Render a lightweight stand-in for the form so the page test stays focused on
// its own responsibility: pass the signed-in uid through (or gate on auth).
vi.mock('../components/profile/ProfileForm', () => ({
  ProfileForm: ({ uid }: { uid: string }) => <div>form for {uid}</div>,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfileEditPage', () => {
  it('renders the form for the signed-in uid', () => {
    setAuth({ user: { uid: 'abc-123' } as User });
    render(<ProfileEditPage />);
    expect(screen.getByText('form for abc-123')).toBeInTheDocument();
  });

  it('shows a loading line while auth resolves', () => {
    setAuth({ user: null, loading: true });
    render(<ProfileEditPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/form for/i)).not.toBeInTheDocument();
  });

  it('does not render the form when signed out', () => {
    setAuth({ user: null, loading: false });
    render(<ProfileEditPage />);
    expect(screen.queryByText(/form for/i)).not.toBeInTheDocument();
  });
});
