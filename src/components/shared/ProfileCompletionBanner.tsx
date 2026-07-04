import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import { getSpeaker } from '../../lib/firestore';

/**
 * sessionStorage key remembering that the banner was dismissed. Per-session
 * (not localStorage) on purpose: a still-incomplete profile should nudge the
 * speaker again next session rather than be silently forgotten forever.
 */
const DISMISS_KEY = 'ponente:completion-banner-dismissed';

const readDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * In-app "finish your profile" nudge shown at the top of the directory to a
 * signed-in speaker whose profile is not yet published (either no profile doc
 * yet, or one with `published === false`). Replaces Firebase In-App Messaging,
 * which has no Web SDK (see ADR 0006).
 *
 * Rendered nothing when signed out, while auth is resolving, when the profile is
 * already published, when dismissed this session, or when the
 * `enable_speaker_registration` kill-switch is off (registration paused). The
 * CTA links to the profile editor; dismissal persists for the session.
 */
export function ProfileCompletionBanner() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { flags } = useRemoteConfig();
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getSpeaker(user.uid)
      .then((speaker) => {
        if (cancelled) return;
        // Nudge when there is no profile yet, or one that is not published.
        setNeedsCompletion(speaker === null || !speaker.published);
      })
      .catch(() => {
        if (!cancelled) setNeedsCompletion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || !user) return null;
  if (!flags.enable_speaker_registration) return null;
  if (dismissed || !needsCompletion) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage failures (e.g. private mode); the banner just reappears.
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="font-semibold text-indigo-900">{t('banner.title')}</p>
        <p className="mt-1 text-sm text-indigo-800">
          {t('banner.description')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/profile/edit"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('banner.cta')}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('banner.dismiss')}
          className="rounded p-2 text-indigo-700 hover:bg-indigo-100"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
}

export default ProfileCompletionBanner;
