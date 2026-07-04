import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import type { User } from 'firebase/auth';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { useAuth, type AuthContextValue } from '../../hooks/useAuth';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import { getSpeaker } from '../../lib/firestore';
import type { FeatureFlags } from '../../lib/remote-config';
import type { Speaker } from '../../types';
import '../../i18n';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));
vi.mock('../../lib/firestore', () => ({ getSpeaker: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseRemoteConfig = vi.mocked(useRemoteConfig);
const mockedGetSpeaker = vi.mocked(getSpeaker);

const FLAG_DEFAULTS: FeatureFlags = {
  enable_speaker_registration: true,
  enable_photo_upload: true,
  enable_city_autocomplete: true,
  enable_tag_requests: true,
  enable_gde_status: true,
  enable_report_abuse: true,
  enable_es_locale: true,
  enable_public_directory: true,
  photo_storage_backend: 'supabase',
  directory_layout: 'grid',
};

const user = { uid: 'ada-1' } as User;

function setAuth(partial: Partial<AuthContextValue> = {}) {
  mockedUseAuth.mockReturnValue({
    user,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    ...partial,
  });
}

function setFlags(over: Partial<FeatureFlags> = {}) {
  mockedUseRemoteConfig.mockReturnValue({
    flags: { ...FLAG_DEFAULTS, ...over },
    loading: false,
    activated: true,
  });
}

const unpublishedSpeaker = { uid: 'ada-1', published: false } as Speaker;
const publishedSpeaker = { uid: 'ada-1', published: true } as Speaker;

function renderBanner() {
  return render(
    <MemoryRouter>
      <ProfileCompletionBanner />
    </MemoryRouter>,
  );
}

const findCta = () =>
  screen.findByRole('link', { name: /complete my profile/i });
const queryCta = () =>
  screen.queryByRole('link', { name: /complete my profile/i });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setAuth();
  setFlags();
  mockedGetSpeaker.mockResolvedValue(unpublishedSpeaker);
});

describe('ProfileCompletionBanner', () => {
  it('is hidden when signed out', async () => {
    setAuth({ user: null });
    renderBanner();
    await waitFor(() => expect(mockedGetSpeaker).not.toHaveBeenCalled());
    expect(queryCta()).not.toBeInTheDocument();
  });

  it('is hidden while auth is still loading', () => {
    setAuth({ user: null, loading: true });
    renderBanner();
    expect(queryCta()).not.toBeInTheDocument();
  });

  it('is hidden when the profile is already published', async () => {
    mockedGetSpeaker.mockResolvedValue(publishedSpeaker);
    renderBanner();
    await waitFor(() => expect(mockedGetSpeaker).toHaveBeenCalledWith('ada-1'));
    expect(queryCta()).not.toBeInTheDocument();
  });

  it('is shown for a signed-in speaker whose profile is unpublished', async () => {
    renderBanner();
    const cta = await findCta();
    expect(cta).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('is shown for a signed-in user with no profile yet', async () => {
    mockedGetSpeaker.mockResolvedValue(null);
    renderBanner();
    expect(await findCta()).toBeInTheDocument();
  });

  it('hides after dismissal and persists the dismissal for the session', async () => {
    const u = userEvent.setup();
    const { unmount } = renderBanner();
    await findCta();

    await u.click(
      screen.getByRole('button', { name: /dismiss this reminder/i }),
    );
    expect(queryCta()).not.toBeInTheDocument();
    expect(sessionStorage.getItem('ponente:completion-banner-dismissed')).toBe(
      '1',
    );

    // Re-mounting in the same session keeps it hidden.
    unmount();
    renderBanner();
    await waitFor(() => expect(mockedGetSpeaker).toHaveBeenCalled());
    expect(queryCta()).not.toBeInTheDocument();
  });

  it('is hidden when the enable_speaker_registration flag is off', async () => {
    setFlags({ enable_speaker_registration: false });
    renderBanner();
    await waitFor(() => expect(mockedGetSpeaker).toHaveBeenCalled());
    expect(queryCta()).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderBanner();
    await findCta();
    expect(await axe(container)).toHaveNoViolations();
  });
});
