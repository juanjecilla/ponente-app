# Task 01: Project Setup

**Phase:** 1
**Estimated Effort:** 1 hour
**Dependencies:** 00 (community files/repo can precede; quality-gate config lands alongside)

---

## Context

Bootstrap the Ponente SPA so feature code has a home. React 18 + Vite + **TypeScript strict**, Tailwind, react-i18next (+ browser language detector), Firebase init, env scaffolding, and the directory structure from `docs/ARCHITECTURE.md`.

## Goal

`npm run build` and `npm run dev` succeed; Firebase initializes; i18n loads EN/ES; Tailwind applies; directory structure matches the architecture.

---

## Implementation Steps

### 1.1 Scaffold
```bash
cd /Users/juanje/Projects/CodingPit/ponente-app
npm create vite@latest . -- --template react-ts
npm install
```
Set `tsconfig.json` → `"strict": true` (+ `noUncheckedIndexedAccess` recommended). Add `npm run typecheck` = `tsc --noEmit`.

### 1.2 Dependencies
```bash
npm i firebase react-router-dom react-i18next i18next i18next-browser-languagedetector @supabase/supabase-js
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
> Sentry/size-limit/test deps come from task 00; storage/showcase SDK usage is gated by later tasks.

### 1.3 Tailwind
- `tailwind.config.js` content: `['./index.html', './src/**/*.{ts,tsx}']`.
- `src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;`.

### 1.4 Directory structure
Create the tree from `docs/ARCHITECTURE.md` (`components/{auth,profile,directory,shared}`, `pages`, `hooks`, `lib/storage`, `types`, `i18n/locales`, `constants`, `scripts`, `public/data`).

### 1.5 Env scaffolding — `.env.example`
```
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
# App Check (task 17)
VITE_RECAPTCHA_SITE_KEY=
# Supabase storage (task 07 / ADR 0004)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Sentry (task 13)
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
```
`.gitignore` must include `.env`, `.env.local`. Document `cp .env.example .env.local` in README.

### 1.6 Firebase init — `src/lib/firebase.ts`
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// App Check is initialized here too (task 17) — BEFORE getFirestore in final form.

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
// NOTE: do NOT call getStorage() here — photos go through lib/storage (ADR 0004).
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 1.7 Hosting config
- `firebase.json`: hosting `public: "dist"`, SPA rewrite `** → /index.html`, plus `firestore.rules` + `firestore.indexes.json` (filled by task 03).
- `.firebaserc`: default project id.

### 1.8 i18n bootstrap — `src/i18n/index.ts`
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  interpolation: { escapeValue: false },
});
export default i18n;
```
Import in `src/main.tsx`. Seed `en.json`/`es.json` with `app`, `nav` keys (task 10 completes them).

---

## Corner Cases & Gotchas
- **`storageBucket`** in config is harmless even when using Supabase, but **never call `getStorage()`** unless the Firebase backend is active (Spark → 402/403). Keep storage access behind `lib/storage`.
- **Strict mode fallout:** Vite template may need small fixes under `strict`/`noUncheckedIndexedAccess`. Budget time.
- **Env at build time:** `import.meta.env.VITE_*` is inlined at build; CI build needs the `VITE_*` vars as secrets/vars (document in task 11).
- **Language detector** persists to localStorage; QA both first-visit (navigator) and returning-visit (cached) paths.
- Do not commit `.env.local`.

## Definition of Done
- [ ] `npm run build` + `npm run dev` succeed; `npm run typecheck` clean under strict.
- [ ] Tailwind class applies on a test element.
- [ ] `src/lib/firebase.ts` exports `app`, `auth`, `db` (no `getStorage`).
- [ ] `firebase.json` + `.firebaserc` + `.env.example` present; `.env*` gitignored.
- [ ] i18n initializes (EN/ES) with language detection; no console errors.
- [ ] Directory structure matches `docs/ARCHITECTURE.md`.
