import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import { SpeakerGrid } from './SpeakerGrid';
import { SpeakerList } from './SpeakerList';
import type { Speaker } from '../../types';
import '../../i18n';

const ts = {} as Timestamp;

const makeSpeaker = (uid: string, name: string): Speaker => ({
  uid,
  name,
  topics: [],
  cities: [],
  cityTierTokens: [],
  contactLinks: [],
  gdeVerified: false,
  published: true,
  disabled: false,
  createdAt: ts,
  updatedAt: ts,
});

const speakers = [makeSpeaker('a', 'Ada'), makeSpeaker('b', 'Bob')];
const label = (slug: string) => slug;

describe('SpeakerGrid / SpeakerList', () => {
  it('grid renders a card per speaker', () => {
    render(
      <MemoryRouter>
        <SpeakerGrid speakers={speakers} topicLabel={label} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bob' })).toBeInTheDocument();
  });

  it('list renders a card per speaker', () => {
    render(
      <MemoryRouter>
        <SpeakerList speakers={speakers} topicLabel={label} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bob' })).toBeInTheDocument();
  });
});
