import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary, ErrorFallback } from './ErrorBoundary';
import { errorTracker } from '../../lib/error-tracker';
import '../../i18n';

// The boundary must report through the errorTracker abstraction only.
vi.mock('../../lib/error-tracker', () => ({
  errorTracker: { captureException: vi.fn(), setUser: vi.fn() },
}));

function Boom(): never {
  throw new Error('render exploded');
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // React logs caught render errors; keep test output clean.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
    expect(errorTracker.captureException).not.toHaveBeenCalled();
  });

  it('shows the fallback and reports to errorTracker when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /something went wrong/i }),
    ).toBeInTheDocument();

    expect(errorTracker.captureException).toHaveBeenCalledTimes(1);
    const [error, context] = vi.mocked(errorTracker.captureException).mock
      .calls[0]!;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('render exploded');
    expect(context).toMatchObject({ boundary: 'root', fatal: true });
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
  });

  it('reload button triggers window.location.reload', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });

    render(<ErrorFallback />);
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('fallback has no accessibility violations', async () => {
    const { container } = render(<ErrorFallback />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
