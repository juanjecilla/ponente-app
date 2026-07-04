import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ContactLinksInput } from './ContactLinksInput';
import type { ContactLink } from '../../types';
import '../../i18n';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContactLinksInput', () => {
  it('shows an empty-state hint when there are no links', () => {
    render(<ContactLinksInput value={[]} />);
    expect(screen.getByText(/no contact links yet/i)).toBeInTheDocument();
  });

  it('appends an email row on "Add link"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactLinksInput value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add link/i }));
    expect(onChange).toHaveBeenCalledWith([{ type: 'email', value: '' }]);
  });

  it('renders a type selector and value input per link', () => {
    const links: ContactLink[] = [
      { type: 'email', value: 'me@example.com' },
      { type: 'github', value: 'https://github.com/me' },
    ];
    render(<ContactLinksInput value={links} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByDisplayValue('me@example.com')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://github.com/me'),
    ).toBeInTheDocument();
  });

  it('emits the edited value on input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ContactLinksInput
        value={[{ type: 'email', value: '' }]}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText(/value/i), 'x');
    expect(onChange).toHaveBeenCalledWith([{ type: 'email', value: 'x' }]);
  });

  it('changes the link type via the selector', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ContactLinksInput
        value={[{ type: 'email', value: 'keep' }]}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox'), 'github');
    expect(onChange).toHaveBeenCalledWith([{ type: 'github', value: 'keep' }]);
  });

  it('removes a row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ContactLinksInput
        value={[
          { type: 'email', value: 'a@b.co' },
          { type: 'website', value: 'https://b.co' },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: /remove/i })[0]!);
    expect(onChange).toHaveBeenCalledWith([
      { type: 'website', value: 'https://b.co' },
    ]);
  });

  it('shows a per-type validation error for an invalid non-empty value', () => {
    render(
      <ContactLinksInput value={[{ type: 'email', value: 'not-an-email' }]} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
  });

  it('shows a URL error when a URL-typed value is invalid', () => {
    render(
      <ContactLinksInput value={[{ type: 'github', value: 'github.com' }]} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/valid url/i);
  });

  it('shows no error for an empty value', () => {
    render(<ContactLinksInput value={[{ type: 'email', value: '' }]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ContactLinksInput
        value={[{ type: 'email', value: 'me@example.com' }]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
