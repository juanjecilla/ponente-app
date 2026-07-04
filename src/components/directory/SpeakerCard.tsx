import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ContactLink, Speaker } from '../../types';

/**
 * Builds a safe `href` for a typed contact link. Email becomes a `mailto:`;
 * every other type must be an `http(s)` URL. Any other scheme (notably
 * `javascript:`) or an unparseable value returns `null` so the caller renders
 * nothing — never an unsafe link.
 */
export function contactHref(link: ContactLink): string | null {
  if (link.type === 'email') {
    const value = link.value.trim();
    return value === '' ? null : `mailto:${value}`;
  }
  try {
    const url = new URL(link.value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    return null;
  } catch {
    return null;
  }
}

/** Two-letter initials for the avatar fallback when no photo is present. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export interface SpeakerCardProps {
  speaker: Speaker;
  /** Resolves a topic slug to a localized label (from `useTags`). */
  topicLabel: (slug: string) => string;
}

/**
 * Directory tile for one speaker: avatar (photo or initials), name linking to
 * the full profile, topic chips, cities with cost-tier badges, typed contact
 * links (safe schemes only) and a "GDE" badge when admin-verified. Speaker-
 * entered content (name, city names) is rendered verbatim, never translated.
 */
export function SpeakerCard({ speaker, topicLabel }: SpeakerCardProps) {
  const { t } = useTranslation();

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {speaker.photo ? (
          <img
            src={speaker.photo}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700"
          >
            {initials(speaker.name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-900">
            <Link
              to={`/speaker/${speaker.uid}`}
              className="text-indigo-700 hover:underline"
            >
              {speaker.name}
            </Link>
          </h3>
          {speaker.gdeVerified && (
            <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {t('directory.gde.verified')}
            </span>
          )}
        </div>
      </div>

      {speaker.topics.length > 0 && (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label={t('directory.topics')}
        >
          {speaker.topics.map((slug) => (
            <li
              key={slug}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
            >
              {topicLabel(slug)}
            </li>
          ))}
        </ul>
      )}

      {speaker.cities.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label={t('directory.cities')}>
          {speaker.cities.map((city) => (
            <li
              key={`${city.key}:${city.tier}`}
              className="flex items-center justify-between gap-2 text-sm text-slate-600"
            >
              <span className="truncate">{city.name}</span>
              <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {t(`directory.tier.${city.tier}`)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {speaker.contactLinks.length > 0 && (
        <ul
          className="flex flex-wrap gap-3"
          aria-label={t('directory.contact')}
        >
          {speaker.contactLinks.map((link) => {
            const href = contactHref(link);
            if (href === null) return null;
            return (
              <li key={`${link.type}:${link.value}`}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                  aria-label={t(`directory.contactType.${link.type}`)}
                >
                  {t(`directory.contactType.${link.type}`)}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export default SpeakerCard;
