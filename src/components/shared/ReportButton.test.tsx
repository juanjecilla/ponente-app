import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { User } from 'firebase/auth';
import { ReportButton } from './ReportButton';
import { useAuth, type AuthContextValue } from '../../hooks/useAuth';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import type { FeatureFlags } from '../../lib/remote-config';
import '../../i18n';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));
vi.mock('../../lib/firestore', () => ({ createReport: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseRemoteConfig = vi.mocked(useRemoteConfig);

const FLAGS: FeatureFlags = {
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

const signInWithGoogle = vi.fn();

function setAuth(partial: Partial<AuthContextValue>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    signInWithGoogle,
    signOut: vi.fn(),
    ...partial,
  });
}

function setFlags(over: Partial<FeatureFlags> = {}) {
  mockedUseRemoteConfig.mockReturnValue({
    flags: { ...FLAGS, ...over },
    loading: false,
    activated: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({});
  setFlags();
});

describe('ReportButton', () => {
  it('is hidden when the enable_report_abuse flag is off', () => {
    setFlags({ enable_report_abuse: false });
    render(<ReportButton reportedUid="s1" />);
    expect(
      screen.queryByRole('button', { name: /report/i }),
    ).not.toBeInTheDocument();
  });

  it('prompts sign-in and does not open the modal when signed out', async () => {
    const user = userEvent.setup();
    setAuth({ user: null });
    render(<ReportButton reportedUid="s1" />);

    await user.click(screen.getByRole('button', { name: /report/i }));

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the report modal when signed in', async () => {
    const user = userEvent.setup();
    setAuth({ user: { uid: 'reporter-9' } as User });
    render(<ReportButton reportedUid="s1" reportedName="Ada" />);

    await user.click(screen.getByRole('button', { name: /report/i }));

    expect(signInWithGoogle).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: /report ada/i }),
    ).toBeInTheDocument();
  });

  it('returns focus to the trigger when the modal is cancelled', async () => {
    const user = userEvent.setup();
    setAuth({ user: { uid: 'reporter-9' } as User });
    render(<ReportButton reportedUid="s1" />);

    const trigger = screen.getByRole('button', { name: /report/i });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReportButton reportedUid="s1" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
