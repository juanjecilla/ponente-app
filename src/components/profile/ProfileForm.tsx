import { useEffect, useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CityAvailability } from '../../lib/city';
import type { ContactLink, GdeStatus, Speaker } from '../../types';
import {
  deriveCityTierTokens,
  getSpeaker,
  upsertSpeaker,
} from '../../lib/firestore';
import { isValidContactLink } from '../../constants/contactTypes';
import { errorTracker } from '../../lib/error-tracker';
import {
  trackProfileUpdated,
  trackSpeakerRegistered,
} from '../../lib/analytics';
import { useRemoteConfig } from '../../hooks/useRemoteConfig';
import { CityAvailabilityInput } from './CityAvailabilityInput';
import { TopicSelector } from './TopicSelector';
import { PhotoUpload } from './PhotoUpload';
import { ContactLinksInput } from './ContactLinksInput';
import { PublishToggle } from './PublishToggle';

export interface ProfileFormProps {
  /** The signed-in speaker's uid — the `speakers/{uid}` doc owner. */
  uid: string;
}

const GDE_OPTIONS: readonly GdeStatus[] = ['none', 'aspiring', 'current'];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Splits a comma/newline separated languages field into trimmed tags. */
function parseLanguages(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Full speaker profile editor. Loads the existing `speakers/{uid}` doc, edits
 * every user-writable field (composing the merged city/topic/photo/contact-link
 * inputs), derives `cityTierTokens`, and persists via `upsertSpeaker`. Admin
 * fields (`disabled`/`gdeVerified`/`reportCount`) are never written. Publishing
 * is gated by {@link PublishToggle} (mirroring the Firestore rule) and fires the
 * first-publish / update analytics events.
 */
export function ProfileForm({ uid }: ProfileFormProps) {
  const { t } = useTranslation();
  const { flags } = useRemoteConfig();
  const ids = useId();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [topics, setTopics] = useState<string[]>([]);
  const [cities, setCities] = useState<CityAvailability[]>([]);
  const [contactLinks, setContactLinks] = useState<ContactLink[]>([]);
  const [gdgChapter, setGdgChapter] = useState('');
  const [languages, setLanguages] = useState('');
  const [gdeStatus, setGdeStatus] = useState<GdeStatus>('none');
  const [talkLink, setTalkLink] = useState('');
  const [published, setPublished] = useState(false);
  // Tracked locally (not via timestamps) to classify first-publish vs. update.
  const [wasPublished, setWasPublished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSpeaker(uid)
      .then((speaker) => {
        if (cancelled || speaker === null) return;
        setName(speaker.name ?? '');
        setBio(speaker.bio ?? '');
        setPhoto(speaker.photo);
        setTopics(speaker.topics ?? []);
        setCities(speaker.cities ?? []);
        setContactLinks(speaker.contactLinks ?? []);
        setGdgChapter(speaker.gdgChapter ?? '');
        setLanguages((speaker.languages ?? []).join(', '));
        setGdeStatus(speaker.gdeStatus ?? 'none');
        setTalkLink(speaker.talkLink ?? '');
        setPublished(speaker.published ?? false);
        setWasPublished(speaker.published ?? false);
      })
      .catch((err: unknown) => {
        errorTracker.captureException(err, { scope: 'ProfileForm.load', uid });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Only valid links are persisted and count toward the publish gate, so the
  // UI gate and the server rule agree on which links "exist".
  const validContactLinks = useMemo(
    () => contactLinks.filter(isValidContactLink),
    [contactLinks],
  );

  const publishCandidate: Partial<Speaker> = useMemo(
    () => ({
      name: name.trim(),
      topics,
      cities,
      contactLinks: validContactLinks,
    }),
    [name, topics, cities, validContactLinks],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('saving');

    const parsedLanguages = parseLanguages(languages);
    const trimmedTalk = talkLink.trim();
    const trimmedBio = bio.trim();
    const trimmedChapter = gdgChapter.trim();

    const data: Partial<Speaker> = {
      name: name.trim(),
      bio: trimmedBio.length > 0 ? trimmedBio : undefined,
      photo,
      topics,
      cities,
      cityTierTokens: deriveCityTierTokens(cities),
      contactLinks: validContactLinks,
      gdgChapter: trimmedChapter.length > 0 ? trimmedChapter : undefined,
      languages: parsedLanguages.length > 0 ? parsedLanguages : undefined,
      // "Not yet" → omit the field rather than store an empty string.
      talkLink: trimmedTalk.length > 0 ? trimmedTalk : undefined,
      published,
    };
    if (flags.enable_gde_status) {
      data.gdeStatus = gdeStatus;
    }

    try {
      await upsertSpeaker(uid, data);
      if (published && !wasPublished) {
        trackSpeakerRegistered();
      } else if (wasPublished) {
        trackProfileUpdated();
      }
      setWasPublished(published);
      setStatus('saved');
    } catch (err) {
      errorTracker.captureException(err, { scope: 'ProfileForm.save', uid });
      setStatus('error');
    }
  };

  if (!flags.enable_speaker_registration) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        <p className="mt-4 text-slate-600">{t('profile.registrationPaused')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <p aria-live="polite" className="p-8 text-slate-500">
        {t('profile.loading')}
      </p>
    );
  }

  const nameId = `${ids}-name`;
  const bioId = `${ids}-bio`;
  const chapterId = `${ids}-chapter`;
  const languagesId = `${ids}-languages`;
  const talkId = `${ids}-talk`;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      <div>
        <label
          htmlFor={nameId}
          className="block text-sm font-medium text-slate-700"
        >
          {t('profile.name')}
        </label>
        <input
          id={nameId}
          type="text"
          required
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor={bioId}
          className="block text-sm font-medium text-slate-700"
        >
          {t('profile.bio')}
        </label>
        <textarea
          id={bioId}
          rows={4}
          maxLength={600}
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          {t('profile.bioCount', { count: bio.length, max: 600 })}
        </p>
      </div>

      {flags.enable_photo_upload && (
        <section aria-label={t('photo.label')}>
          <PhotoUpload value={photo} onChange={setPhoto} />
        </section>
      )}

      <section aria-label={t('topics.legend')}>
        <TopicSelector
          value={topics}
          onChange={setTopics}
          enableTagRequests={flags.enable_tag_requests}
        />
      </section>

      <section aria-label={t('city.searchLabel')}>
        <h2 className="mb-2 text-sm font-medium text-slate-700">
          {t('profile.cities')}
        </h2>
        <CityAvailabilityInput
          value={cities}
          onChange={setCities}
          enabled={flags.enable_city_autocomplete}
        />
      </section>

      <ContactLinksInput value={contactLinks} onChange={setContactLinks} />

      <div>
        <label
          htmlFor={chapterId}
          className="block text-sm font-medium text-slate-700"
        >
          {t('profile.gdgChapter')}
        </label>
        <input
          id={chapterId}
          type="text"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          value={gdgChapter}
          onChange={(e) => setGdgChapter(e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor={languagesId}
          className="block text-sm font-medium text-slate-700"
        >
          {t('profile.languages')}
        </label>
        <input
          id={languagesId}
          type="text"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          placeholder={t('profile.languagesPlaceholder')}
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
        />
      </div>

      {flags.enable_gde_status && (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            {t('profile.gdeStatus')}
          </legend>
          <p className="text-xs text-slate-500">{t('profile.gdeStatusNote')}</p>
          <div className="mt-2 space-y-1">
            {GDE_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${ids}-gde`}
                  value={option}
                  checked={gdeStatus === option}
                  onChange={() => setGdeStatus(option)}
                />
                <span>{t(`profile.gde.${option}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label
          htmlFor={talkId}
          className="block text-sm font-medium text-slate-700"
        >
          {t('profile.talkLink')}
        </label>
        <input
          id={talkId}
          type="url"
          className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          placeholder={t('profile.talkLinkPlaceholder')}
          value={talkLink}
          onChange={(e) => setTalkLink(e.target.value)}
        />
      </div>

      <PublishToggle
        data={publishCandidate}
        checked={published}
        onChange={setPublished}
      />

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? t('profile.saving') : t('profile.save')}
        </button>
        <p aria-live="polite" className="text-sm">
          {status === 'saved' && (
            <span className="text-green-700">{t('profile.saved')}</span>
          )}
          {status === 'error' && (
            <span role="alert" className="text-red-600">
              {t('profile.saveError')}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

export default ProfileForm;
