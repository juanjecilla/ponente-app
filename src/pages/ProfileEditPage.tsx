import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { ProfileForm } from '../components/profile/ProfileForm';

/**
 * Speaker profile edit page. Rendered inside a protected route, so a user is
 * normally present; while auth resolves (or in the unexpected signed-out case)
 * it shows a loading line rather than rendering the form without an owner uid.
 */
export function ProfileEditPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading || user === null) {
    return (
      <p aria-live="polite" className="p-8 text-slate-500">
        {t('auth.loading')}
      </p>
    );
  }

  return <ProfileForm uid={user.uid} />;
}

export default ProfileEditPage;
