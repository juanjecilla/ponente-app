import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface FromState {
  from?: { pathname?: string };
}

const DEFAULT_REDIRECT = '/profile/edit';

export function LoginPage() {
  const { t } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as FromState | null;
  const from = state?.from?.pathname ?? DEFAULT_REDIRECT;

  // Already signed in: skip the login screen.
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async () => {
    await signInWithGoogle();
    navigate(from, { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-600">
          {t('login.title')}
        </h1>
        <p className="mt-3 text-slate-600">{t('login.subtitle')}</p>
        <button
          type="button"
          onClick={() => void handleSignIn()}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {t('login.google')}
        </button>
      </div>
    </main>
  );
}
