import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Timestamp } from 'firebase/firestore';
import { ProfileForm } from './ProfileForm';
import { getSpeaker, upsertSpeaker } from '../../lib/firestore';
import {
  trackSpeakerRegistered,
  trackProfileUpdated,
} from '../../lib/analytics';
import { errorTracker } from '../../lib/error-tracker';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import type { Speaker } from '../../types';
import '../../i18n';

// Mock firestore (its firebase.ts side-import needs env keys); stub the async
// I/O fns and mirror the two pure helpers the form + PublishToggle rely on.
vi.mock('../../lib/firestore', () => ({
  getSpeaker: vi.fn(),
  upsertSpeaker: vi.fn(),
  deriveCityTierTokens: (cities: { key: string; tier: string }[]): string[] =>
    cities.map((c) => `${c.key}:${c.tier}`),
  isPublishReady: (d: Partial<Speaker>): boolean =>
    typeof d.name === 'string' &&
    d.name.length > 0 &&
    Array.isArray(d.topics) &&
    d.topics.length > 0 &&
    Array.isArray(d.cities) &&
    d.cities.length > 0 &&
    Array.isArray(d.contactLinks) &&
    d.contactLinks.length > 0,
}));
vi.mock('../../lib/analytics', () => ({
  trackSpeakerRegistered: vi.fn(),
  trackProfileUpdated: vi.fn(),
}));
vi.mock('../../lib/error-tracker', () => ({
  errorTracker: { captureException: vi.fn() },
}));
vi.mock('../../hooks/useRemoteConfig', () => ({ useRemoteConfig: vi.fn() }));

const mockedUseRemoteConfig = vi.mocked(useRemoteConfig);

function setFlags(overrides: Record<string, boolean> = {}) {
  mockedUseRemoteConfig.mockReturnValue({
    flags: {
      enable_speaker_registration: true,
      enable_photo_upload: true,
      enable_city_autocomplete: true,
      enable_tag_requests: true,
      enable_gde_status: true,
      ...overrides,
    } as never,
    loading: false,
    activated: false,
  });
}

// --- Child-input stubs: drive the form's state via known values -------------
vi.mock('./PhotoUpload', () => ({
  PhotoUpload: ({ onChange }: { onChange?: (u?: string) => void }) => (
    <button type="button" onClick={() => onChange?.('https://cdn/x.webp')}>
      set-photo
    </button>
  ),
}));
vi.mock('./TopicSelector', () => ({
  TopicSelector: ({ onChange }: { onChange?: (t: string[]) => void }) => (
    <button type="button" onClick={() => onChange?.(['web'])}>
      set-topics
    </button>
  ),
}));
vi.mock('./CityAvailabilityInput', () => ({
  CityAvailabilityInput: ({
    onChange,
  }: {
    onChange?: (c: unknown[]) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange?.([
          { name: 'Madrid', key: 'madrid', lat: 1, lng: 2, tier: 'free' },
        ])
      }
    >
      set-city
    </button>
  ),
}));
vi.mock('./ContactLinksInput', () => ({
  ContactLinksInput: ({ onChange }: { onChange?: (l: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange?.([{ type: 'email', value: 'me@example.com' }])}
    >
      set-contact
    </button>
  ),
}));

const mockedGetSpeaker = vi.mocked(getSpeaker);
const mockedUpsert = vi.mocked(upsertSpeaker);

const ts = {} as Timestamp;

function speaker(overrides: Partial<Speaker> = {}): Speaker {
  return {
    uid: 'u1',
    name: 'Existing Name',
    topics: ['android'],
    cities: [],
    cityTierTokens: [],
    contactLinks: [],
    gdeVerified: false,
    published: false,
    disabled: false,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

/** Fill name + set topics/cities/contact via the stubbed children. */
async function makeReady(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^name$/i), 'Ada Lovelace');
  await user.click(screen.getByText('set-topics'));
  await user.click(screen.getByText('set-city'));
  await user.click(screen.getByText('set-contact'));
}

beforeEach(() => {
  vi.clearAllMocks();
  setFlags();
  mockedGetSpeaker.mockResolvedValue(null);
  mockedUpsert.mockResolvedValue(undefined);
});

describe('ProfileForm', () => {
  it('loads and prefills an existing profile', async () => {
    mockedGetSpeaker.mockResolvedValue(speaker({ name: 'Grace Hopper' }));
    render(<ProfileForm uid="u1" />);
    expect(await screen.findByDisplayValue('Grace Hopper')).toBeInTheDocument();
  });

  it('saves a new profile with derived city tokens and no admin fields', async () => {
    const user = userEvent.setup();
    render(<ProfileForm uid="u1" />);
    await screen.findByLabelText(/^name$/i);

    await makeReady(user);
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockedUpsert).toHaveBeenCalledTimes(1));
    const [uid, data] = mockedUpsert.mock.calls[0]!;
    expect(uid).toBe('u1');
    expect(data.name).toBe('Ada Lovelace');
    expect(data.topics).toEqual(['web']);
    expect(data.cityTierTokens).toEqual(['madrid:free']);
    expect(data.contactLinks).toEqual([
      { type: 'email', value: 'me@example.com' },
    ]);
    expect(data.published).toBe(false);
    expect(data).not.toHaveProperty('disabled');
    expect(data).not.toHaveProperty('gdeVerified');
    expect(data).not.toHaveProperty('reportCount');
    expect(await screen.findByText(/profile saved/i)).toBeInTheDocument();
  });

  it('omits talkLink when left blank', async () => {
    const user = userEvent.setup();
    render(<ProfileForm uid="u1" />);
    await screen.findByLabelText(/^name$/i);

    await makeReady(user);
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockedUpsert).toHaveBeenCalled());
    expect(mockedUpsert.mock.calls[0]![1].talkLink).toBeUndefined();
  });

  it('fires speaker_registered on first publish', async () => {
    const user = userEvent.setup();
    render(<ProfileForm uid="u1" />);
    await screen.findByLabelText(/^name$/i);

    await makeReady(user);
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockedUpsert).toHaveBeenCalled());
    expect(mockedUpsert.mock.calls[0]![1].published).toBe(true);
    expect(trackSpeakerRegistered).toHaveBeenCalledTimes(1);
    expect(trackProfileUpdated).not.toHaveBeenCalled();
  });

  it('fires profile_updated when re-saving an already-published profile', async () => {
    mockedGetSpeaker.mockResolvedValue(
      speaker({
        name: 'Ada',
        topics: ['web'],
        published: true,
        contactLinks: [{ type: 'email', value: 'a@b.co' }],
        cities: [
          { name: 'Madrid', key: 'madrid', lat: 1, lng: 2, tier: 'free' },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<ProfileForm uid="u1" />);
    await screen.findByDisplayValue('Ada');

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(mockedUpsert).toHaveBeenCalled());
    expect(trackProfileUpdated).toHaveBeenCalledTimes(1);
    expect(trackSpeakerRegistered).not.toHaveBeenCalled();
  });

  it('reports a save failure and shows an error', async () => {
    mockedUpsert.mockRejectedValue(new Error('permission-denied'));
    const user = userEvent.setup();
    render(<ProfileForm uid="u1" />);
    await screen.findByLabelText(/^name$/i);

    await makeReady(user);
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /couldn't save/i,
    );
    expect(errorTracker.captureException).toHaveBeenCalled();
  });

  it('shows a registration-paused message when the flag is off', async () => {
    setFlags({ enable_speaker_registration: false });
    render(<ProfileForm uid="u1" />);
    expect(
      await screen.findByText(/new registrations are paused/i),
    ).toBeInTheDocument();
  });
});
