import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags } from '../../hooks/useTags';
import { useAuth } from '../../hooks/useAuth';
import { createTagRequest } from '../../lib/firestore';

export interface TopicSelectorProps {
  /** Currently-selected topic slugs (controlled). */
  value?: string[];
  /** Called with the next slug list when a topic is toggled. */
  onChange?: (topics: string[]) => void;
  /**
   * Gates the "request a missing topic" flow. Wire to the Remote Config
   * `enable_tag_requests` flag from the parent form. Defaults to `true`.
   */
  enableTagRequests?: boolean;
}

type RequestStatus = 'idle' | 'submitting' | 'submitted' | 'error';

/** Orders tags by label but always keeps the `other` catch-all slug last. */
function orderSlugsLast<T extends { slug: string }>(tags: T[]): T[] {
  return [...tags].sort((a, b) => {
    if (a.slug === 'other') return 1;
    if (b.slug === 'other') return -1;
    return 0;
  });
}

/**
 * Multi-select of topics loaded from the dynamic `tags` Firestore taxonomy.
 * Displays translated labels, stores slugs (never labels), and — when enabled
 * and signed in — lets speakers request a missing topic (`tag_requests`).
 */
export function TopicSelector({
  value = [],
  onChange,
  enableTagRequests = true,
}: TopicSelectorProps) {
  const { t, i18n } = useTranslation();
  const { tags, loading, error, labelFor } = useTags();
  const { user } = useAuth();

  const ids = useId();
  const [requested, setRequested] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');

  const selected = useMemo(() => new Set(value), [value]);
  const orderedTags = useMemo(() => orderSlugsLast(tags), [tags]);

  const toggle = (slug: string) => {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange?.([...next]);
  };

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    const tag = requested.trim().toLowerCase();
    if (tag === '' || user === null) return;
    setStatus('submitting');
    try {
      await createTagRequest({ tag, requestedBy: user.uid });
      setStatus('submitted');
      setRequested('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          {t('topics.legend')}
        </legend>

        {loading && (
          <p aria-live="polite" className="mt-2 text-sm text-slate-500">
            {t('topics.loading')}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('topics.error')}
          </p>
        )}

        {!loading && !error && orderedTags.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">{t('topics.empty')}</p>
        )}

        {orderedTags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {orderedTags.map((tag) => {
              const inputId = `${ids}-${tag.slug}`;
              return (
                <li key={tag.slug}>
                  <label
                    htmlFor={inputId}
                    className="flex items-center gap-2 rounded border border-slate-300 px-3 py-1"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      value={tag.slug}
                      checked={selected.has(tag.slug)}
                      onChange={() => toggle(tag.slug)}
                    />
                    <span>{labelFor(tag.slug, i18n.language)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {enableTagRequests && (
        <form onSubmit={submitRequest} className="space-y-2">
          <label
            htmlFor={`${ids}-request`}
            className="block text-sm font-medium text-slate-700"
          >
            {t('topics.requestLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id={`${ids}-request`}
              type="text"
              className="flex-1 rounded border border-slate-300 px-3 py-2"
              placeholder={t('topics.requestPlaceholder')}
              value={requested}
              disabled={user === null || status === 'submitting'}
              onChange={(e) => {
                setRequested(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
            />
            <button
              type="submit"
              className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-50"
              disabled={
                user === null ||
                status === 'submitting' ||
                requested.trim() === ''
              }
            >
              {t('topics.requestButton')}
            </button>
          </div>

          {user === null && (
            <p className="text-sm text-slate-500">
              {t('topics.requestSignedOut')}
            </p>
          )}

          <p aria-live="polite" className="text-sm">
            {status === 'submitted' && (
              <span className="text-green-700">
                {t('topics.requestSubmitted')}
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-600">{t('topics.requestError')}</span>
            )}
          </p>
        </form>
      )}
    </div>
  );
}

export default TopicSelector;
