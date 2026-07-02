// stub — completed in task 08 (public directory / speaker detail).
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

export function SpeakerPage() {
  const { t } = useTranslation();
  const { uid } = useParams<{ uid: string }>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t('pages.speaker')}</h1>
      <p className="mt-2 text-slate-600">{uid}</p>
    </div>
  );
}
