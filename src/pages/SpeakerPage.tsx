import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSpeaker } from '../lib/firestore';
import { useTags } from '../hooks/useTags';
import { trackSpeakerProfileViewed } from '../lib/analytics';
import { errorTracker } from '../lib/error-tracker';
import { ReportButton } from '../components/shared/ReportButton';
import { contactHref } from '../components/directory/SpeakerCard';
import type { Speaker } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; speaker: Speaker }
  | { status: 'not-found' };

/**
 * Public speaker profile (`/speaker/:uid`). Re-checks `published && !disabled`
 * client-side (the rules also block reading a disabled profile — a
 * permission-denied is treated as "not available"), renders the full profile
 * with safe typed contact links, and includes the {@link ReportButton}. Fires
 * `speaker_profile_viewed` once the profile resolves. Speaker-entered content is
 * rendered verbatim.
 */
export function SpeakerPage() {
  const { t, i18n } = useTranslation();
  const { uid } = useParams<{ uid: string }>();
  const { labelFor } = useTags();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    // Wrapped in an async fn (not called synchronously in the effect body) so
    // the loading reset doesn't trigger a cascading synchronous re-render.
    const load = async (): Promise<void> => {
      setState({ status: 'loading' });
      if (uid === undefined) {
        setState({ status: 'not-found' });
        return;
      }
      try {
        const speaker = await getSpeaker(uid);
        if (cancelled) return;
        if (speaker === null || !speaker.published || speaker.disabled) {
          setState({ status: 'not-found' });
          return;
        }
        setState({ status: 'found', speaker });
        trackSpeakerProfileViewed({ uid: speaker.uid });
      } catch (err: unknown) {
        if (cancelled) return;
        // A permission-denied on a disabled/private profile is expected — show
        // "not available" rather than an error, but still record other faults.
        errorTracker.captureException(
          err instanceof Error ? err : new Error(String(err)),
          { context: 'SpeakerPage', uid },
        );
        setState({ status: 'not-found' });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (state.status === 'loading') {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p aria-live="polite" className="text-slate-500">
          {t('speaker.loading')}
        </p>
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('speaker.notFoundTitle')}
        </h1>
        <p className="mt-3 text-slate-600">{t('speaker.notFoundMessage')}</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 underline">
          {t('speaker.backToDirectory')}
        </Link>
      </main>
    );
  }

  const { speaker } = state;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/" className="text-sm text-indigo-600 underline">
        {t('speaker.backToDirectory')}
      </Link>

      <header className="mt-4 flex items-center gap-4">
        {speaker.photo ? (
          <img
            src={speaker.photo}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{speaker.name}</h1>
          {speaker.gdeVerified && (
            <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {t('directory.gde.verified')}
            </span>
          )}
          {!speaker.gdeVerified &&
            (speaker.gdeStatus === 'aspiring' ||
              speaker.gdeStatus === 'current') && (
              <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {t(`speaker.gde.${speaker.gdeStatus}`)}
              </span>
            )}
        </div>
      </header>

      {speaker.bio && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.bio')}
          </h2>
          <p className="mt-2 whitespace-pre-line text-slate-700">
            {speaker.bio}
          </p>
        </section>
      )}

      {speaker.topics.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.topics')}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {speaker.topics.map((slug) => (
              <li
                key={slug}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700"
              >
                {labelFor(slug, i18n.language)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {speaker.cities.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.cities')}
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {speaker.cities.map((city) => (
              <li
                key={`${city.key}:${city.tier}`}
                className="flex items-center justify-between gap-3 text-slate-700"
              >
                <span>{city.name}</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {t(`directory.tier.${city.tier}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {speaker.languages && speaker.languages.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.languages')}
          </h2>
          <p className="mt-2 text-slate-700">{speaker.languages.join(', ')}</p>
        </section>
      )}

      {speaker.gdgChapter && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.gdgChapter')}
          </h2>
          <p className="mt-2 text-slate-700">{speaker.gdgChapter}</p>
        </section>
      )}

      {speaker.contactLinks.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('speaker.contact')}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-3">
            {speaker.contactLinks.map((link) => {
              const href = contactHref(link);
              if (href === null) return null;
              return (
                <li key={`${link.type}:${link.value}`}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline"
                  >
                    {t(`directory.contactType.${link.type}`)}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {speaker.talkLink &&
        contactHref({ type: 'website', value: speaker.talkLink }) && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {t('speaker.talkLink')}
            </h2>
            <a
              href={speaker.talkLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-indigo-600 underline"
            >
              {t('speaker.talkLinkView')}
            </a>
          </section>
        )}

      <div className="mt-8 border-t border-slate-200 pt-4">
        <ReportButton reportedUid={speaker.uid} reportedName={speaker.name} />
      </div>
    </main>
  );
}

export default SpeakerPage;
