import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect } from 'vitest';
import App from './App';
import './i18n';

describe('App', () => {
  it('renders the app name and tagline', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /ponente/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/travel to your city/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
