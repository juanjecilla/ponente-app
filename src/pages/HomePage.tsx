// stub — completed in task 08 (public directory). For now it preserves the
// original Ponente hero so "/" keeps showing the landing content.
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-indigo-600">
          {t('app.name')}
        </h1>
        <p className="mt-3 text-lg text-slate-600">{t('app.tagline')}</p>
      </div>
    </main>
  );
}
