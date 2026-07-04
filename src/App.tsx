import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LanguageSwitcher } from './components/shared/LanguageSwitcher';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SpeakerPage } from './pages/SpeakerPage';

/**
 * Shared top bar shown on every route: the app wordmark (links home) on the
 * left, the language switcher on the right.
 */
function AppHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <Link
        to="/"
        aria-label={t('nav.home')}
        className="text-lg font-bold tracking-tight text-indigo-600"
      >
        {t('app.name')}
      </Link>
      <LanguageSwitcher />
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileEditPage />
              </ProtectedRoute>
            }
          />
          <Route path="/speaker/:uid" element={<SpeakerPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
