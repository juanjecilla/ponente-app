import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SpeakerPage } from './pages/SpeakerPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
