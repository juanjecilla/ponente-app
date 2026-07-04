import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import type { Timestamp } from 'firebase/firestore';
import { SpeakerCard, contactHref } from './SpeakerCard';
import type { Speaker } from '../../types';
import '../../i18n';

const ts = {} as Timestamp;

function makeSpeaker(over: Partial<Speaker> = {}): Speaker {
  return {
    uid: 's1',
    name: 'Ada Lovelace',
    topics: ['android'],
    cities: [
      { name: 'Madrid, Spain', key: 'madrid', lat: 0, lng: 0, tier: 'free' },
    ],
    cityTierTokens: ['madrid:free'],
    contactLinks: [{ type: 'email', value: 'ada@example.com' }],
    gdeVerified: false,
    published: true,
    disabled: false,
    createdAt: ts,
    updatedAt: ts,
    ...over,
  };
}

const label = (slug: string) => slug.toUpperCase();

function renderCard(speaker: Speaker) {
  return render(
    <MemoryRouter>
      <SpeakerCard speaker={speaker} topicLabel={label} />
    </MemoryRouter>,
  );
}

describe('contactHref', () => {
  it('builds a mailto for email', () => {
    expect(contactHref({ type: 'email', value: 'a@b.com' })).toBe(
      'mailto:a@b.com',
    );
  });

  it('accepts http(s) urls', () => {
    expect(contactHref({ type: 'website', value: 'https://x.dev/' })).toBe(
      'https://x.dev/',
    );
  });

  it('rejects a javascript: scheme', () => {
    expect(
      contactHref({ type: 'website', value: 'javascript:alert(1)' }),
    ).toBeNull();
  });

  it('rejects an unparseable value', () => {
    expect(contactHref({ type: 'website', value: 'not a url' })).toBeNull();
  });
});

describe('SpeakerCard', () => {
  it('renders the name as a link to the profile', () => {
    renderCard(makeSpeaker());
    const link = screen.getByRole('link', { name: 'Ada Lovelace' });
    expect(link).toHaveAttribute('href', '/speaker/s1');
  });

  it('renders topic labels, city name and a tier badge', () => {
    renderCard(makeSpeaker());
    expect(screen.getByText('ANDROID')).toBeInTheDocument();
    expect(screen.getByText('Madrid, Spain')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows the GDE badge only when admin-verified', () => {
    const { rerender } = renderCard(makeSpeaker({ gdeVerified: false }));
    expect(screen.queryByText('GDE')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SpeakerCard
          speaker={makeSpeaker({ gdeVerified: true })}
          topicLabel={label}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('GDE')).toBeInTheDocument();
  });

  it('renders a safe contact link and drops unsafe ones', () => {
    renderCard(
      makeSpeaker({
        contactLinks: [
          { type: 'website', value: 'https://ada.dev/' },
          { type: 'github', value: 'javascript:alert(1)' },
        ],
      }),
    );
    const website = screen.getByRole('link', { name: 'Website' });
    expect(website).toHaveAttribute('href', 'https://ada.dev/');
    expect(website).toHaveAttribute('rel', 'noopener noreferrer');
    expect(website).toHaveAttribute('target', '_blank');
    expect(
      screen.queryByRole('link', { name: 'GitHub' }),
    ).not.toBeInTheDocument();
  });

  it('renders initials when no photo is set', () => {
    renderCard(makeSpeaker({ photo: undefined }));
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCard(makeSpeaker({ gdeVerified: true }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
