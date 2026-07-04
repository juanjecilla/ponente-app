import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { PublishToggle } from './PublishToggle';
import type { Speaker } from '../../types';
import '../../i18n';

// Avoid importing real Firebase (firestore.ts -> firebase.ts needs env keys).
// Provide a faithful mirror of the pure publish-gate predicate under test.
vi.mock('../../lib/firestore', () => ({
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

const readyData: Partial<Speaker> = {
  name: 'Ada',
  topics: ['web'],
  cities: [{ name: 'Madrid', key: 'madrid', lat: 0, lng: 0, tier: 'free' }],
  contactLinks: [{ type: 'email', value: 'ada@example.com' }],
};

describe('PublishToggle', () => {
  it('is enabled when the profile is publish-ready', () => {
    render(
      <PublishToggle data={readyData} checked={false} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('switch')).toBeEnabled();
    expect(
      screen.queryByText(/before you can publish/i),
    ).not.toBeInTheDocument();
  });

  it('is disabled and lists what is missing when not ready', () => {
    render(
      <PublishToggle
        data={{ name: '', topics: [], cities: [], contactLinks: [] }}
        checked={false}
        onChange={vi.fn()}
      />,
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-describedby');
    expect(screen.getByText(/at least one topic/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one city/i)).toBeInTheDocument();
    expect(
      screen.getByText(/at least one valid contact link/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/your name/i)).toBeInTheDocument();
  });

  it('lists only the fields still missing', () => {
    render(
      <PublishToggle
        data={{ ...readyData, contactLinks: [] }}
        checked={false}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/at least one valid contact link/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/at least one topic/i)).not.toBeInTheDocument();
  });

  it('calls onChange with true when toggled on while ready', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PublishToggle data={readyData} checked={false} onChange={onChange} />,
    );

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('allows unpublishing even when the profile became incomplete', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PublishToggle
        data={{ name: '', topics: [], cities: [], contactLinks: [] }}
        checked
        onChange={onChange}
      />,
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeEnabled();
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PublishToggle
        data={{ name: '', topics: [], cities: [], contactLinks: [] }}
        checked={false}
        onChange={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
