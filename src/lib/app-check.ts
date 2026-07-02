/**
 * Pure decision helpers for Firebase App Check (reCAPTCHA v3).
 *
 * The actual SDK initialization lives in `lib/firebase.ts` (excluded from
 * coverage). This module holds only the environment-driven guards so they can
 * be unit-tested without touching the Firebase SDK.
 *
 * Resilience is the point: when `VITE_RECAPTCHA_SITE_KEY` is absent (a
 * contributor's local, CI, preview builds), App Check must NOT initialize —
 * otherwise the build/preview breaks. See task 17 + docs/FIREBASE.md.
 */

/** Environment inputs relevant to App Check, decoupled from `import.meta.env`. */
export interface AppCheckEnv {
  /** reCAPTCHA v3 site key. When empty/absent, App Check stays off. */
  siteKey?: string | undefined;
  /** Debug token for dev/CI. `'true'` = auto-generate & log; else a registered token. */
  debugToken?: string | undefined;
  /** Vite `import.meta.env.DEV` — debug tokens are only wired in dev. */
  dev?: boolean | undefined;
}

/**
 * Whether App Check should be initialized at all.
 *
 * Requires a non-empty reCAPTCHA site key. This is the resilience guard: with
 * no key configured we skip App Check entirely so dev/CI/build keep working.
 */
export function shouldEnableAppCheck(env: AppCheckEnv): boolean {
  return typeof env.siteKey === 'string' && env.siteKey.trim().length > 0;
}

/**
 * Resolve the value to assign to `self.FIREBASE_APPCHECK_DEBUG_TOKEN`.
 *
 * - Only active in dev (never leak debug tokens into production bundles).
 * - `'true'` → boolean `true`, telling the SDK to generate a token and log it
 *   (register that token in the Firebase console once).
 * - Any other non-empty string → used verbatim as a pre-registered debug token.
 * - Absent/empty → `undefined` (no debug token).
 */
export function resolveDebugToken(
  env: AppCheckEnv,
): string | boolean | undefined {
  if (!env.dev) return undefined;
  const token = env.debugToken?.trim();
  if (!token) return undefined;
  return token === 'true' ? true : token;
}
