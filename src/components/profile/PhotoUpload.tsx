import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { getStorageProvider } from '../../lib/storage';

const ACCEPTED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export interface PhotoUploadProps {
  /** Current photo URL stored on the speaker doc (controlled). */
  value?: string;
  /** Called with the new URL after upload, or `undefined` after removal. */
  onChange?: (url: string | undefined) => void;
}

type Status = 'idle' | 'uploading' | 'error';

/** First two initials of a display name, for the no-photo empty state. */
function initials(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * Avatar upload: file input + preview, client-side type/size validation, and
 * upload through the active {@link getStorageProvider} (Supabase or Firebase,
 * chosen by Remote Config — this component never touches a storage SDK). Uses
 * `useAuth` for the owner uid. All strings via `t()` (`photo.*`).
 */
export function PhotoUpload({ value, onChange }: PhotoUploadProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ids = useId();
  const inputId = `${ids}-file`;

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | undefined>(value);
  const objectUrlRef = useRef<string | null>(null);

  const revokeLocalPreview = () => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        // Best-effort; revoke is not critical.
      }
      objectUrlRef.current = null;
    }
  };

  // Revoke any outstanding object URL on unmount.
  useEffect(() => revokeLocalPreview, []);

  // Show an instant local preview before the upload resolves. Guarded because
  // `URL.createObjectURL` is unavailable in some non-browser environments.
  const showLocalPreview = (file: Blob) => {
    try {
      if (typeof URL.createObjectURL === 'function') {
        revokeLocalPreview();
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreview(url);
      }
    } catch {
      // Preview is best-effort; the real URL replaces it after upload.
    }
  };

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again re-triggers change.
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setStatus('error');
      setError(t('photo.errorType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus('error');
      setError(t('photo.errorSize'));
      return;
    }
    if (!user) {
      setStatus('error');
      setError(t('photo.errorNoUser'));
      return;
    }

    showLocalPreview(file);
    setStatus('uploading');
    try {
      const url = await getStorageProvider().uploadPhoto(user.uid, file);
      revokeLocalPreview();
      setPreview(url);
      onChange?.(url);
      setStatus('idle');
    } catch {
      revokeLocalPreview();
      setPreview(value);
      setStatus('error');
      setError(t('photo.errorUpload'));
    }
  };

  const handleRemove = async () => {
    if (user) {
      try {
        // Best-effort: an orphaned object is preferable to a stuck UI.
        await getStorageProvider().deletePhoto(user.uid);
      } catch {
        // Ignore — the URL is cleared regardless (ADR 0004: orphaned photos).
      }
    }
    revokeLocalPreview();
    setPreview(undefined);
    onChange?.(undefined);
    setStatus('idle');
    setError(null);
  };

  const uploading = status === 'uploading';

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700">
        {t('photo.label')}
      </span>

      <div className="flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt={t('photo.previewAlt')}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600"
          >
            {initials(user?.displayName) || '👤'}
          </span>
        )}

        <div className="space-y-2">
          <label
            htmlFor={inputId}
            className="inline-block cursor-pointer rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
          >
            {preview ? t('photo.change') : t('photo.choose')}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            disabled={uploading}
            onChange={handleSelect}
          />
          {preview && (
            <button
              type="button"
              className="ml-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-red-600"
              onClick={handleRemove}
              disabled={uploading}
            >
              {t('photo.remove')}
            </button>
          )}
          <p className="text-xs text-slate-500">{t('photo.hint')}</p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {uploading ? t('photo.uploading') : ''}
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default PhotoUpload;
