import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  type RemoteConfig,
} from 'firebase/remote-config';
import { app } from './firebase';

/**
 * Typed Firebase Remote Config feature flags.
 *
 * Every user-facing feature is gated by a flag so it can be killed without a
 * redeploy. In-SDK defaults MUST match intended production behavior because
 * `getValue` returns these defaults before the first `fetchAndActivate`
 * resolves (and forever, if the fetch never succeeds — dev/CI/offline).
 *
 * See docs/FIREBASE.md ("Remote Config — Feature Flags") and
 * docs/tasks/14-remote-config.md.
 */

export type PhotoStorageBackend = 'supabase' | 'firebase';
export type DirectoryLayout = 'grid' | 'list';

export interface FeatureFlags {
  /** Gates the profile registration form + publish. */
  enable_speaker_registration: boolean;
  /** Gates the photo upload section. */
  enable_photo_upload: boolean;
  /** Enables Photon search-as-you-type (else static list / plain text). */
  enable_city_autocomplete: boolean;
  /** Gates the "request a missing tag" input. */
  enable_tag_requests: boolean;
  /** Gates the self-declared GDE status fields. */
  enable_gde_status: boolean;
  /** Gates the "report abuse" button. */
  enable_report_abuse: boolean;
  /** Gates the language switcher (ES locale). */
  enable_es_locale: boolean;
  /** Gates the public `/` directory listing. */
  enable_public_directory: boolean;
  /** Selects the photo StorageProvider (ADR 0004). */
  photo_storage_backend: PhotoStorageBackend;
  /** Directory layout A/B test parameter. */
  directory_layout: DirectoryLayout;
}

/**
 * In-SDK defaults. Boolean kill-switches default `true` (feature on); the two
 * string params default to their production values. Keep in sync with the
 * table in docs/FIREBASE.md and the Remote Config console.
 */
export const FLAG_DEFAULTS: FeatureFlags = {
  enable_speaker_registration: true,
  enable_photo_upload: true,
  enable_city_autocomplete: true,
  enable_tag_requests: true,
  enable_gde_status: true,
  enable_report_abuse: true,
  enable_es_locale: true,
  enable_public_directory: true,
  photo_storage_backend: 'supabase',
  directory_layout: 'grid',
};

const PHOTO_STORAGE_BACKENDS: readonly PhotoStorageBackend[] = [
  'supabase',
  'firebase',
];
const DIRECTORY_LAYOUTS: readonly DirectoryLayout[] = ['grid', 'list'];

/** Keys of {@link FeatureFlags} whose value is a boolean kill-switch. */
type BooleanFlagKey = {
  [K in keyof FeatureFlags]: FeatureFlags[K] extends boolean ? K : never;
}[keyof FeatureFlags];

/**
 * Lazily-initialized Remote Config singleton. `getRemoteConfig` requires a
 * browser environment and can throw (SSR/tests/unsupported); we memoize both
 * success and failure so accessors fall back to {@link FLAG_DEFAULTS} and never
 * throw.
 */
let rc: RemoteConfig | null = null;
let initFailed = false;

const getRc = (): RemoteConfig | null => {
  if (rc !== null || initFailed) return rc;
  try {
    const instance = getRemoteConfig(app);
    // Short interval in dev for fast flag iteration; 12h in prod to stay well
    // within Spark-tier read caps (accept up to 12h kill-switch latency).
    instance.settings.minimumFetchIntervalMillis = import.meta.env.PROD
      ? 12 * 3_600_000
      : 60_000;
    instance.defaultConfig = { ...FLAG_DEFAULTS };
    rc = instance;
    return rc;
  } catch {
    initFailed = true;
    return null;
  }
};

/**
 * Fetch + activate Remote Config. Resilient: resolves `false` (and leaves
 * in-SDK defaults in effect) when Remote Config is unavailable or the fetch
 * fails. Never throws.
 *
 * @returns `true` if a fresh config was activated, otherwise `false`.
 */
export const initRemoteConfig = async (): Promise<boolean> => {
  const instance = getRc();
  if (instance === null) return false;
  try {
    return await fetchAndActivate(instance);
  } catch {
    return false;
  }
};

const readBoolean = (key: BooleanFlagKey, fallback: boolean): boolean => {
  const instance = getRc();
  if (instance === null) return fallback;
  try {
    return getValue(instance, key).asBoolean();
  } catch {
    return fallback;
  }
};

const readEnum = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T => {
  const instance = getRc();
  if (instance === null) return fallback;
  try {
    const raw = getValue(instance, key).asString();
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
};

/* ---- Typed accessors ---------------------------------------------------- */

export const getEnableSpeakerRegistration = (): boolean =>
  readBoolean(
    'enable_speaker_registration',
    FLAG_DEFAULTS.enable_speaker_registration,
  );

export const getEnablePhotoUpload = (): boolean =>
  readBoolean('enable_photo_upload', FLAG_DEFAULTS.enable_photo_upload);

export const getEnableCityAutocomplete = (): boolean =>
  readBoolean(
    'enable_city_autocomplete',
    FLAG_DEFAULTS.enable_city_autocomplete,
  );

export const getEnableTagRequests = (): boolean =>
  readBoolean('enable_tag_requests', FLAG_DEFAULTS.enable_tag_requests);

export const getEnableGdeStatus = (): boolean =>
  readBoolean('enable_gde_status', FLAG_DEFAULTS.enable_gde_status);

export const getEnableReportAbuse = (): boolean =>
  readBoolean('enable_report_abuse', FLAG_DEFAULTS.enable_report_abuse);

export const getEnableEsLocale = (): boolean =>
  readBoolean('enable_es_locale', FLAG_DEFAULTS.enable_es_locale);

export const getEnablePublicDirectory = (): boolean =>
  readBoolean('enable_public_directory', FLAG_DEFAULTS.enable_public_directory);

export const getPhotoStorageBackend = (): PhotoStorageBackend =>
  readEnum(
    'photo_storage_backend',
    PHOTO_STORAGE_BACKENDS,
    FLAG_DEFAULTS.photo_storage_backend,
  );

export const getDirectoryLayout = (): DirectoryLayout =>
  readEnum(
    'directory_layout',
    DIRECTORY_LAYOUTS,
    FLAG_DEFAULTS.directory_layout,
  );

/** Snapshot of every flag with its currently-active, typed value. */
export const getFlags = (): FeatureFlags => ({
  enable_speaker_registration: getEnableSpeakerRegistration(),
  enable_photo_upload: getEnablePhotoUpload(),
  enable_city_autocomplete: getEnableCityAutocomplete(),
  enable_tag_requests: getEnableTagRequests(),
  enable_gde_status: getEnableGdeStatus(),
  enable_report_abuse: getEnableReportAbuse(),
  enable_es_locale: getEnableEsLocale(),
  enable_public_directory: getEnablePublicDirectory(),
  photo_storage_backend: getPhotoStorageBackend(),
  directory_layout: getDirectoryLayout(),
});
