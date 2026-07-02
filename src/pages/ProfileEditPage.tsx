// stub — completed in task 04 (profile form).
import { useTranslation } from 'react-i18next';

export function ProfileEditPage() {
  const { t } = useTranslation();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t('pages.profileEdit')}</h1>
    </div>
  );
}
