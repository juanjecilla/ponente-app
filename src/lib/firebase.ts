import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  resolveDebugToken,
  shouldEnableAppCheck,
  type AppCheckEnv,
} from './app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3) — MUST init after initializeApp but BEFORE
// getFirestore, or early Firestore requests are unverified/rejected once
// enforcement is on. RESILIENT: when VITE_RECAPTCHA_SITE_KEY is absent
// (dev/CI/build), we skip init entirely so nothing breaks. See task 17.
const appCheckEnv: AppCheckEnv = {
  siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  debugToken: import.meta.env.VITE_APPCHECK_DEBUG,
  dev: import.meta.env.DEV,
};

if (shouldEnableAppCheck(appCheckEnv) && appCheckEnv.siteKey) {
  const debugToken = resolveDebugToken(appCheckEnv);
  if (debugToken !== undefined) {
    // The SDK reads this global to accept dev/CI requests under enforcement.
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckEnv.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// NOTE: do NOT call getStorage() here — photos go through lib/storage (ADR 0004).
export const auth = getAuth(app);
export const db = getFirestore(app);
