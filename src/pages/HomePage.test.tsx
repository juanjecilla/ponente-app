import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import type { Timestamp } from 'firebase/firestore';
import { HomePage } from './HomePage';
import { useSpeakers } from '../hooks/useSpeakers';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import { trackSpeakerSearched } from '../lib/analytics';
import type { FeatureFlags } from '../lib/remote-config';
import type { Speaker } from '../types';
import '../i18n';

vi.mock('../hooks/useSpeakers', () => ({ useSpeakers: vi.fn() }));
vi.mock('../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));
vi.mock('../hooks/useTags', () => ({
  useTags: () => ({
    tags: [],
    loading: false,
    error: null,
    labelFor: (slug: string) => slug.toUpperCase(),
  }),
}));
vi.mock('../lib/analytics', () => ({ trackSpeakerSearched: vi.fn() }));

const mockedUseSpeakers = vi.mocked(useSpeakers);
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
const makeSpeaker = (uid: string, name: string, cityKey: string): Speaker => ({
  uid,
  name,
  topics: [],
  cities: [{ name: cityKey, key: cityKey, lat: 0, lng: 0, tier: 'free' }],
  cityTierTokens: [`${cityKey}:free`],
  contactLinks: [],
  gdeVerified: false,
  published: true,
  disabled: false,
  createdAt: ts,
  updatedAt: ts,
});

const ada = makeSpeaker('ada', 'Ada', 'madrid');
const bob = makeSpeaker('bob', 'Bob', 'sevilla');

const reload = vi.fn();

function setSpeakers(over: Partial<ReturnType<typeof useSpeakers>> = {}) {
  mockedUseSpeakers.mockReturnValue({
    speakers: [ada, bob],
    loading: false,
    error: null,
    reload,
    ...over,
  });
}

function setFlags(over: Partial<FeatureFlags> = {}) {
  mockedUseRemoteConfig.mockReturnValue({
    flags: { ...FLAGS, ...over },
    loading: false,
    activated: true,
  });
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setSpeakers();
  setFlags();
});

describe('HomePage', () => {
  it('shows a loading state', () => {
    setSpeakers({ speakers: [], loading: true });
    renderHome();
    expect(screen.getByText(/loading speakers/i)).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    setSpeakers({ speakers: [], error: new Error('boom') });
    renderHome();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows the empty-directory message when there are no speakers', () => {
    setSpeakers({ speakers: [] });
    renderHome();
    expect(screen.getByText(/no speakers have published/i)).toBeInTheDocument();
  });

  it('renders the grid layout by default', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Ada' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('list').some((l) => l.className.includes('grid')),
    ).toBe(true);
  });

  it('renders the list layout when directory_layout=list', () => {
    setFlags({ directory_layout: 'list' });
    renderHome();
    expect(
      screen.getAllByRole('list').some((l) => l.className.includes('flex-col')),
    ).toBe(true);
  });

  it('filters the visible speakers and fires a debounced search event', async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByRole('link', { name: 'Bob' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'madrid' }));

    expect(screen.queryByRole('link', { name: 'Bob' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ada' })).toBeInTheDocument();

    // The analytics event is debounced (~600ms), so wait for it to settle.
    await waitFor(() =>
      expect(trackSpeakerSearched).toHaveBeenCalledWith({ filterType: 'city' }),
    );
  });

  it('shows a no-match message when filters exclude everyone', async () => {
    const user = userEvent.setup();
    renderHome();
    // Filtering by a tier no speaker offers empties the results.
    await user.click(screen.getByRole('checkbox', { name: 'Needs expenses' }));
    await waitFor(() =>
      expect(screen.getByText(/no speakers match/i)).toBeInTheDocument(),
    );
  });

  it('respects the enable_public_directory kill switch', () => {
    setFlags({ enable_public_directory: false });
    renderHome();
    expect(
      screen.getByText(/directory is currently unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ada' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHome();
    expect(await axe(container)).toHaveNoViolations();
  });
});
