import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import type { Timestamp } from 'firebase/firestore';
import { SpeakerPage } from './SpeakerPage';
import { getSpeaker } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import { trackSpeakerProfileViewed } from '../lib/analytics';
import { errorTracker } from '../lib/error-tracker';
import type { FeatureFlags } from '../lib/remote-config';
import type { Speaker } from '../types';
import '../i18n';

vi.mock('../lib/firestore', () => ({
  getSpeaker: vi.fn(),
  createReport: vi.fn(),
}));
vi.mock('../hooks/useTags', () => ({
  useTags: () => ({
    tags: [],
    loading: false,
    error: null,
    labelFor: (slug: string) => slug.toUpperCase(),
  }),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));
vi.mock('../lib/analytics', () => ({ trackSpeakerProfileViewed: vi.fn() }));
vi.mock('../lib/error-tracker', () => ({
  errorTracker: { captureException: vi.fn() },
}));

const mockedGetSpeaker = vi.mocked(getSpeaker);
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

const ts = {} as Timestamp;
const speaker: Speaker = {
  uid: 'ada',
  name: 'Ada Lovelace',
  bio: 'Pioneer of computing.',
  topics: ['android'],
  cities: [{ name: 'Madrid', key: 'madrid', lat: 0, lng: 0, tier: 'free' }],
  cityTierTokens: ['madrid:free'],
  contactLinks: [{ type: 'website', value: 'https://ada.dev/' }],
  languages: ['English', 'Spanish'],
  gdeVerified: true,
  published: true,
  disabled: false,
  createdAt: ts,
  updatedAt: ts,
};

function renderPage(uid = 'ada') {
  return render(
    <MemoryRouter initialEntries={[`/speaker/${uid}`]}>
      <Routes>
        <Route path="/speaker/:uid" element={<SpeakerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  });
  mockedUseRemoteConfig.mockReturnValue({
    flags: FLAGS,
    loading: false,
    activated: true,
  });
});

describe('SpeakerPage', () => {
  it('renders the full profile of a published speaker', async () => {
    mockedGetSpeaker.mockResolvedValue(speaker);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Ada Lovelace', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pioneer of computing.')).toBeInTheDocument();
    expect(screen.getByText('ANDROID')).toBeInTheDocument();
    expect(screen.getByText('English, Spanish')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://ada.dev/',
    );
    expect(trackSpeakerProfileViewed).toHaveBeenCalledWith({ uid: 'ada' });
  });

  it('includes the report button', async () => {
    mockedGetSpeaker.mockResolvedValue(speaker);
    renderPage();
    expect(
      await screen.findByRole('button', { name: /report/i }),
    ).toBeInTheDocument();
  });

  it('shows "not available" when the speaker does not exist', async () => {
    mockedGetSpeaker.mockResolvedValue(null);
    renderPage('ghost');
    expect(
      await screen.findByRole('heading', { name: /not available/i }),
    ).toBeInTheDocument();
    expect(trackSpeakerProfileViewed).not.toHaveBeenCalled();
  });

  it('shows "not available" for an unpublished profile', async () => {
    mockedGetSpeaker.mockResolvedValue({ ...speaker, published: false });
    renderPage();
    expect(
      await screen.findByRole('heading', { name: /not available/i }),
    ).toBeInTheDocument();
  });

  it('shows "not available" for a disabled profile', async () => {
    mockedGetSpeaker.mockResolvedValue({ ...speaker, disabled: true });
    renderPage();
    expect(
      await screen.findByRole('heading', { name: /not available/i }),
    ).toBeInTheDocument();
  });

  it('treats a permission-denied error as "not available" and records it', async () => {
    mockedGetSpeaker.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /not available/i }),
      ).toBeInTheDocument(),
    );
    expect(errorTracker.captureException).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    mockedGetSpeaker.mockResolvedValue(speaker);
    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'Ada Lovelace', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
