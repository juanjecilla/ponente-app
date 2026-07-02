import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { CityAvailabilityInput } from './CityAvailabilityInput';
import type { CityAvailability } from '../../lib/city';
import { useCitySearch } from '../../hooks/useCitySearch';
import type { UseCitySearch } from '../../hooks/useCitySearch';
import '../../i18n';

vi.mock('../../hooks/useCitySearch', () => ({
  useCitySearch: vi.fn(),
}));

const mockedHook = vi.mocked(useCitySearch);

const madrid = { name: 'Madrid, Spain', key: 'madrid', lat: 40.4, lng: -3.7 };
const malaga = { name: 'Málaga, Spain', key: 'malaga', lat: 36.7, lng: -4.4 };

function setHook(partial: Partial<UseCitySearch>) {
  mockedHook.mockReturnValue({
    results: [],
    loading: false,
    usedFallback: false,
    ...partial,
  });
}

beforeEach(() => {
  mockedHook.mockReset();
  setHook({ results: [madrid, malaga] });
});

describe('CityAvailabilityInput', () => {
  it('renders a combobox and lists search results', async () => {
    const user = userEvent.setup();
    render(<CityAvailabilityInput />);

    const input = screen.getByRole('combobox', { name: /city/i });
    await user.type(input, 'ma');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Madrid, Spain');
  });

  it('adds a city with the chosen tier via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityAvailabilityInput onChange={onChange} />);

    await user.type(screen.getByRole('combobox'), 'mad');
    await user.click(screen.getByRole('option', { name: 'Madrid, Spain' }));

    // Tier picker appears; pick a non-default tier.
    await user.click(screen.getByLabelText(/needs expenses/i));
    await user.click(screen.getByRole('button', { name: /add city/i }));

    expect(onChange).toHaveBeenCalledWith([
      { ...madrid, tier: 'needs-expenses' },
    ]);
  });

  it('prevents duplicate key:tier entries', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: CityAvailability[] = [{ ...madrid, tier: 'free' }];
    render(<CityAvailabilityInput value={value} onChange={onChange} />);

    await user.type(screen.getByRole('combobox'), 'mad');
    await user.click(screen.getByRole('option', { name: 'Madrid, Spain' }));
    // Default tier is 'free' — same token as the existing entry.
    await user.click(screen.getByRole('button', { name: /add city/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports keyboard selection with arrow keys and enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CityAvailabilityInput onChange={onChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'ma');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}'); // -> Málaga

    await user.click(screen.getByRole('button', { name: /add city/i }));
    expect(onChange).toHaveBeenCalledWith([{ ...malaga, tier: 'free' }]);
  });

  it('removes an added city', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: CityAvailability[] = [
      { ...madrid, tier: 'free' },
      { ...malaga, tier: 'self-covered' },
    ];
    render(<CityAvailabilityInput value={value} onChange={onChange} />);

    const added = screen.getByRole('list', { name: /added cities/i });
    await user.click(
      within(added).getByRole('button', { name: /remove madrid/i }),
    );

    expect(onChange).toHaveBeenCalledWith([
      { ...malaga, tier: 'self-covered' },
    ]);
  });

  it('shows the offline notice when the fallback is used', () => {
    setHook({ results: [madrid], usedFallback: true });
    render(<CityAvailabilityInput />);
    expect(screen.getByText(/offline results/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const value: CityAvailability[] = [{ ...madrid, tier: 'free' }];
    const { container } = render(<CityAvailabilityInput value={value} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
