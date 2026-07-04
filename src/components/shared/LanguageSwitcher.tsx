import { useTranslation } from 'react-i18next';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import { trackLocaleChanged, type AppLocale } from '../../lib/analytics';

/** The locales this switcher can toggle between, with their label keys. */
const LOCALES: readonly { locale: AppLocale; labelKey: string }[] = [
  { locale: 'en', labelKey: 'language.english' },
  { locale: 'es', labelKey: 'language.spanish' },
] as const;

/**
 * EN/ES language toggle rendered in the app header. Switching calls
 * `i18n.changeLanguage`, which persists the choice through the LanguageDetector's
 * localStorage cache, and fires the `locale_changed` analytics event.
 *
 * Hidden entirely when the `enable_es_locale` flag is off — with only one
 * supported locale there is nothing to toggle. Rendered as an accessible group
 * of buttons using `aria-pressed` to mark the active locale.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { flags } = useRemoteConfig();

  if (!flags.enable_es_locale) return null;

  const active = (i18n.resolvedLanguage ?? i18n.language).startsWith('es')
    ? 'es'
    : 'en';

  const handleChange = (locale: AppLocale) => {
    if (locale === active) return;
    void i18n.changeLanguage(locale);
    trackLocaleChanged({ locale });
  };

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
    >
      {LOCALES.map(({ locale, labelKey }) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleChange(locale)}
            className={`rounded px-2.5 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
