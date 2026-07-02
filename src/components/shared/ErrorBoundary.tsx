import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorTracker } from '../../lib/error-tracker';

/** Friendly, i18n fallback shown when a render error is caught. */
export function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-8">
      <div role="alert" className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('error.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('error.message')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500"
        >
          {t('error.reload')}
        </button>
      </div>
    </main>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback; defaults to <ErrorFallback />. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global error boundary. Catches render errors, reports them through the
 * `errorTracker` abstraction, and shows a friendly fallback UI.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    errorTracker.captureException(error, {
      boundary: 'root',
      componentStack: info.componentStack ?? undefined,
      fatal: true,
    });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
