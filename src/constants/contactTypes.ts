import type { ContactType, ContactLink } from '../types';

/**
 * Per-type metadata for a typed contact link: the i18n keys for its label,
 * placeholder and validation error, plus a pure validator for its value.
 * Adding a new {@link ContactType} means adding one entry here — the form and
 * `ContactLinksInput` derive their options and validation from this list.
 */
export interface ContactTypeConfig {
  type: ContactType;
  /** i18n key for the type's human label (`contact.type.*`). */
  labelKey: string;
  /** i18n key for the value input's placeholder (`contact.placeholder.*`). */
  placeholderKey: string;
  /** i18n key for the per-type validation error (`contact.error.*`). */
  errorKey: string;
  /** HTML input `type` best suited to the value (email vs. url). */
  inputType: 'email' | 'url';
  /** Validates a (possibly untrimmed) value for this contact type. Pure. */
  validate: (value: string) => boolean;
}

// Pragmatic, not RFC-exhaustive: a single `@` with non-space local/domain and
// at least one dot in the domain. Good enough for a self-service directory.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Any absolute http(s) URL with a non-empty path/host after the scheme.
const URL_RE = /^https?:\/\/\S+$/i;

const validateEmail = (value: string): boolean => EMAIL_RE.test(value.trim());
const validateUrl = (value: string): boolean => URL_RE.test(value.trim());

/** Ordered contact-type configs — drives the type selector's option order. */
export const CONTACT_TYPES: readonly ContactTypeConfig[] = [
  {
    type: 'email',
    labelKey: 'contact.type.email',
    placeholderKey: 'contact.placeholder.email',
    errorKey: 'contact.error.email',
    inputType: 'email',
    validate: validateEmail,
  },
  {
    type: 'linkedin',
    labelKey: 'contact.type.linkedin',
    placeholderKey: 'contact.placeholder.linkedin',
    errorKey: 'contact.error.url',
    inputType: 'url',
    validate: validateUrl,
  },
  {
    type: 'twitter',
    labelKey: 'contact.type.twitter',
    placeholderKey: 'contact.placeholder.twitter',
    errorKey: 'contact.error.url',
    inputType: 'url',
    validate: validateUrl,
  },
  {
    type: 'github',
    labelKey: 'contact.type.github',
    placeholderKey: 'contact.placeholder.github',
    errorKey: 'contact.error.url',
    inputType: 'url',
    validate: validateUrl,
  },
  {
    type: 'website',
    labelKey: 'contact.type.website',
    placeholderKey: 'contact.placeholder.website',
    errorKey: 'contact.error.url',
    inputType: 'url',
    validate: validateUrl,
  },
  {
    type: 'sessionize',
    labelKey: 'contact.type.sessionize',
    placeholderKey: 'contact.placeholder.sessionize',
    errorKey: 'contact.error.url',
    inputType: 'url',
    validate: validateUrl,
  },
] as const;

/** Lookup of {@link ContactTypeConfig} by {@link ContactType}. */
export const CONTACT_TYPE_MAP: Record<ContactType, ContactTypeConfig> =
  Object.fromEntries(CONTACT_TYPES.map((c) => [c.type, c])) as Record<
    ContactType,
    ContactTypeConfig
  >;

/** True when `value` is valid for the given contact `type`. */
export const isValidContactValue = (
  type: ContactType,
  value: string,
): boolean =>
  // `type` is a closed ContactType union — the lookup is total, not injectable.
  // eslint-disable-next-line security/detect-object-injection
  CONTACT_TYPE_MAP[type].validate(value);

/** True when a contact link's value is valid for its type. */
export const isValidContactLink = (link: ContactLink): boolean =>
  isValidContactValue(link.type, link.value);
