import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import type { FeatureFlags } from '../../lib/remote-config';
import { trackLocaleChanged } from '../../lib/analytics';
import i18n from '../../i18n';

vi.mock('../../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));
vi.mock('../../lib/analytics', () => ({ trackLocaleChanged: vi.fn() }));

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

function setFlags(over: Partial<FeatureFlags> = {}) {
  mockedUseRemoteConfig.mockReturnValue({
    flags: { ...FLAGS, ...over },
    loading: false,
    activated: true,
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  setFlags();
  await i18n.changeLanguage('en');
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('LanguageSwitcher', () => {
  it('renders a labelled group with EN and ES buttons', () => {
    render(<LanguageSwitcher />);
    expect(
      screen.getByRole('group', { name: /language/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
  });

  it('marks the active locale with aria-pressed', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('changes language and fires analytics when a new locale is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Español' }));

    expect(i18n.language).toBe('es');
    expect(trackLocaleChanged).toHaveBeenCalledWith({ locale: 'es' });
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not re-fire analytics when the active locale is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(trackLocaleChanged).not.toHaveBeenCalled();
  });

  it('is hidden when the enable_es_locale flag is off', () => {
    setFlags({ enable_es_locale: false });
    const { container } = render(<LanguageSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LanguageSwitcher />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
