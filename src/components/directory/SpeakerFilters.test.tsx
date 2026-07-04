import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { SpeakerFilters } from './SpeakerFilters';
import { EMPTY_FILTER, type SpeakerFilterState } from '../../lib/filter';
import type { SpeakerFilterType } from '../../lib/analytics';
import '../../i18n';

const cityOptions = [
  { key: 'madrid', name: 'Madrid' },
  { key: 'sevilla', name: 'Sevilla' },
];
const topicSlugs = ['android', 'web'];
const topicLabel = (slug: string) => slug.toUpperCase();

/** Controlled harness so toggles persist and we can observe onChange. */
function Harness({
  onChange,
  resultCount = 2,
}: {
  onChange?: (next: SpeakerFilterState, facet: SpeakerFilterType) => void;
  resultCount?: number;
}) {
  const [state, setState] = useState<SpeakerFilterState>(EMPTY_FILTER);
  return (
    <SpeakerFilters
      state={state}
      onChange={(next, facet) => {
        setState(next);
        onChange?.(next, facet);
      }}
      cityOptions={cityOptions}
      topicSlugs={topicSlugs}
      topicLabel={topicLabel}
      resultCount={resultCount}
    />
  );
}

describe('SpeakerFilters', () => {
  it('renders city, topic and tier controls', () => {
    render(<Harness />);
    expect(
      screen.getByRole('checkbox', { name: 'Madrid' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'ANDROID' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Free' })).toBeInTheDocument();
  });

  it('toggles a city and reports the "city" facet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Madrid' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cityKeys: ['madrid'] }),
      'city',
    );
    expect(screen.getByRole('checkbox', { name: 'Madrid' })).toBeChecked();
  });

  it('toggles a topic and reports the "topic" facet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'WEB' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ topics: ['web'] }),
      'topic',
    );
  });

  it('toggles a tier and reports the "tier" facet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Needs expenses' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tiers: ['needs-expenses'] }),
      'tier',
    );
  });

  it('announces the result count via an aria-live region', () => {
    render(<Harness resultCount={5} />);
    expect(screen.getByText('5 speakers')).toBeInTheDocument();
  });

  it('shows and applies "clear filters" only when a filter is active', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(
      screen.queryByRole('button', { name: /clear filters/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Madrid' }));
    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByRole('checkbox', { name: 'Madrid' })).not.toBeChecked();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Harness />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
