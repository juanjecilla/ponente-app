import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Speaker } from '../../types';
import { isPublishReady } from '../../lib/firestore';

export interface PublishToggleProps {
  /** The candidate profile whose required fields gate publishing. */
  data: Partial<Speaker>;
  /** Whether the profile is currently marked published (controlled). */
  checked: boolean;
  /** Called with the next published state when the switch is toggled. */
  onChange: (published: boolean) => void;
}

/**
 * Publish switch, gated by the same predicate the Firestore rule enforces
 * ({@link isPublishReady}). Turning publish ON is disabled until every required
 * field is present; turning it OFF is always allowed (unpublish is never
 * gated). When not ready, the specific missing fields are listed and announced
 * via `aria-describedby`.
 */
export function PublishToggle({ data, checked, onChange }: PublishToggleProps) {
  const { t } = useTranslation();
  const ids = useId();
  const missingId = `${ids}-missing`;

  const ready = isPublishReady(data);

  const missing: string[] = [];
  if (!(typeof data.name === 'string' && data.name.trim().length > 0)) {
    missing.push(t('publish.missing.name'));
  }
  if (!(data.topics && data.topics.length > 0)) {
    missing.push(t('publish.missing.topics'));
  }
  if (!(data.cities && data.cities.length > 0)) {
    missing.push(t('publish.missing.cities'));
  }
  if (!(data.contactLinks && data.contactLinks.length > 0)) {
    missing.push(t('publish.missing.contactLinks'));
  }

  // Publishing is blocked until ready; unpublishing an already-published
  // profile stays available even if it later became incomplete.
  const disabled = !ready && !checked;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={!ready ? missingId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-slate-700">
          {t('publish.label')}
        </span>
      </label>

      {!ready && (
        <div id={missingId} className="text-sm text-amber-700">
          <p>{t('publish.missingIntro')}</p>
          <ul className="ml-5 list-disc">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PublishToggle;
