# Architecture: Ponente

> **Source of truth.** This file reflects the **reconciled richer design** (2026-06). It supersedes the earlier simpler draft. Where it differs from old assumptions, the change is flagged inline with `CHANGED:`. Decisions with trade-offs live in `docs/adr/`.

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + Vite + TypeScript (strict) | SPA, no SSR |
| Auth | Firebase Auth (Google OAuth) | Spark/free |
| Database | Firestore | Spark/free (50k reads/20k writes per day) |
| Photo storage | **Abstraction**: Supabase Storage (default) **or** Firebase Storage | Behind Remote Config `photo_storage_backend`. See ADR 0004 |
| Hosting | Firebase Hosting | Spark/free, preview channels |
| Styling | Tailwind CSS | |
| i18n | react-i18next + browser language detector | EN/ES |
| City search | **Photon (komoot)** OSM geocoder | Replaces Nominatim. See ADR 0003 |
| Feature flags | Firebase Remote Config | Kill-switches + A/B param |
| Observability | Sentry + Firebase Analytics behind `ErrorTracker` | See ADR 0002 |
| Abuse protection | Firebase App Check (reCAPTCHA v3) | Firestore enforcement |
| Analytics / Perf / A/B | Firebase Analytics, Performance Monitoring, A/B Testing | All web-supported, free |
| ~~In-App Messaging~~ | **Dropped — not supported on Web.** Custom `<ProfileCompletionBanner>` instead | See ADR 0006 |

### Free-tier constraints that shaped this design
- **No Cloud Functions** (Spark plan) → no server-side logic. All moderation/admin = manual via Firebase console. `reportCount` is **not** maintained client-side (insecure). See ADR 0005.
- **Firebase Storage requires Blaze since 2026-02-03** → default photo backend is Supabase (free 1 GB). ADR 0004.
- **Nominatim prohibits autocomplete** → Photon. ADR 0003.

## Project Structure

```
ponente-app/
├── public/
│   └── data/cities.json          # static curated city fallback (GeoNames pop>15k, ES/EU)
├── src/
│   ├── components/
│   │   ├── auth/ProtectedRoute.tsx
│   │   ├── profile/
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── CityAvailabilityInput.tsx   # city search + tier picker
│   │   │   ├── TopicSelector.tsx           # reads tags collection
│   │   │   ├── ContactLinksInput.tsx       # typed links
│   │   │   ├── PhotoUpload.tsx             # uses StorageProvider
│   │   │   └── PublishToggle.tsx
│   │   ├── directory/
│   │   │   ├── SpeakerCard.tsx
│   │   │   ├── SpeakerFilters.tsx
│   │   │   ├── SpeakerGrid.tsx             # directory_layout="grid"
│   │   │   └── SpeakerList.tsx             # directory_layout="list"
│   │   └── shared/
│   │       ├── ReportButton.tsx
│   │       ├── ReportModal.tsx
│   │       ├── LanguageSwitcher.tsx
│   │       ├── ProfileCompletionBanner.tsx # replaces In-App Messaging
│   │       └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── HomePage.tsx          # public directory  (/)
│   │   ├── LoginPage.tsx         # /login
│   │   ├── ProfileEditPage.tsx   # /profile/edit (protected)
│   │   └── SpeakerPage.tsx       # /speaker/:uid (public)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSpeakers.ts        # Firestore directory query
│   │   ├── useCitySearch.ts      # Photon debounced search + cache
│   │   ├── useTags.ts            # tags collection
│   │   └── useRemoteConfig.ts    # typed flag accessors
│   ├── lib/
│   │   ├── firebase.ts           # init order: app → App Check → auth/firestore
│   │   ├── firestore.ts          # typed helpers
│   │   ├── photon.ts             # city geocoder client
│   │   ├── error-tracker.ts      # ErrorProvider abstraction
│   │   ├── remote-config.ts      # flags
│   │   ├── analytics.ts          # logEvent wrappers (typed events)
│   │   ├── perf.ts               # custom traces
│   │   └── storage/
│   │       ├── index.ts          # StorageProvider selector (reads flag)
│   │       ├── types.ts          # StorageProvider interface
│   │       ├── supabase.ts       # SupabaseStorageProvider (default)
│   │       └── firebase.ts       # FirebaseStorageProvider
│   ├── types/index.ts
│   ├── i18n/{index.ts,locales/{en.json,es.json}}
│   ├── constants/{tiers.ts,contactTypes.ts}
│   ├── App.tsx
│   └── main.tsx
├── scripts/seed-tags.ts          # one-off Firestore tag seeding
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .firebaserc
├── .env.example
└── package.json
```

## Firestore Schema

> `CHANGED:` typed contact links, `cityTierTokens`, dynamic `tags` collection, `gdeVerified`, authenticated reports, no client `reportCount` writes.

### `speakers/{uid}`

```typescript
import { Timestamp } from 'firebase/firestore';

export type CostTier = 'free' | 'self-covered' | 'needs-expenses';
export type ContactType = 'email' | 'linkedin' | 'twitter' | 'github' | 'website' | 'sessionize';
export type GdeStatus = 'none' | 'aspiring' | 'current';

export interface CityAvailability {
  name: string;        // canonical Photon display name, e.g. "Madrid, Spain"
  key: string;         // normalized slug for matching, e.g. "madrid"
  lat: number;
  lng: number;
  tier: CostTier;
}

export interface ContactLink {
  type: ContactType;
  value: string;       // email address OR url, validated per type
}

export interface Speaker {
  uid: string;
  name: string;
  photo?: string;            // URL from whichever StorageProvider is active
  bio?: string;
  topics: string[];          // tag slugs (FK → tags/{slug})
  cities: CityAvailability[];
  cityTierTokens: string[];  // derived: `${key}:${tier}`, e.g. "madrid:free" — for filtering
  contactLinks: ContactLink[];
  gdgChapter?: string;
  languages?: string[];
  gdeStatus?: GdeStatus;     // self-reported, shown as "unverified"
  gdeVerified: boolean;      // admin-only (console). Client cannot write.
  talkLink?: string;
  published: boolean;
  disabled: boolean;         // admin-only (console). Client cannot write.
  reportCount?: number;      // admin-only (console). Not maintained by client. See ADR 0005.
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `tags/{slug}`  (dynamic taxonomy — `CHANGED:` was hardcoded constant)

```typescript
export interface Tag {
  label: { en: string; es: string };
  createdAt: Timestamp;
}
// Seed slugs: android, web, cloud, ai-ml, flutter, firebase, devops, security,
//             data, open-source, community, other
```

### `tag_requests/{id}`

```typescript
export interface TagRequest {
  tag: string;             // raw requested label
  requestedBy: string;     // uid
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';  // admin sets via console
}
```

### `reports/{id}`  (`CHANGED:` authenticated only)

```typescript
export interface Report {
  reportedUid: string;
  reportedBy: string;      // uid — REQUIRED (auth-gated)
  reason: 'spam' | 'fake' | 'inappropriate' | 'wrong-info';
  comment?: string;
  createdAt: Timestamp;
}
```

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    // Required fields present for a published profile
    function publishReady(d) {
      return d.name is string && d.name.size() > 0
          && d.topics is list && d.topics.size() > 0
          && d.cities is list && d.cities.size() > 0
          && d.contactLinks is list && d.contactLinks.size() > 0;
    }

    // Client must never touch admin-only fields
    function adminFieldsUnchanged() {
      return request.resource.data.disabled == resource.data.disabled
          && request.resource.data.gdeVerified == resource.data.gdeVerified
          && request.resource.data.get('reportCount', 0) == resource.data.get('reportCount', 0);
    }

    match /speakers/{uid} {
      // Public: only published, non-disabled
      allow read: if resource.data.published == true && resource.data.disabled == false;
      // Owner reads own (even if unpublished/disabled)
      allow read: if isOwner(uid);

      // Create: owner only, admin fields locked to safe defaults, no premature publish
      allow create: if isOwner(uid)
                    && request.resource.data.disabled == false
                    && request.resource.data.gdeVerified == false
                    && (request.resource.data.published == false || publishReady(request.resource.data));

      // Update: owner only, admin fields untouched, publish gate enforced
      allow update: if isOwner(uid)
                    && adminFieldsUnchanged()
                    && (request.resource.data.published == false || publishReady(request.resource.data));
    }

    match /tags/{slug} {
      allow read: if true;          // public
      allow write: if false;        // admin/seed via console or Admin SDK
    }

    match /tag_requests/{id} {
      allow create: if request.auth != null
                    && request.resource.data.requestedBy == request.auth.uid;
      allow read, update, delete: if false;   // admin via console
    }

    match /reports/{id} {
      allow create: if request.auth != null
                    && request.resource.data.reportedBy == request.auth.uid;
      allow read, update, delete: if false;   // admin via console
    }
  }
}
```

> **App Check** is enforced on Firestore (and Supabase has its own RLS). Enable enforcement only after debug tokens are wired for dev + CI (see task 17), or local/CI writes will be rejected.

## Firestore Indexes

`firestore.indexes.json` — the directory query filters on two equality fields, which needs a composite index:

```json
{
  "indexes": [
    {
      "collectionGroup": "speakers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "disabled", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy: `firebase deploy --only firestore:indexes`.

## Data Flow

```
[Google OAuth] → Firebase Auth → uid
                                  ↓
                ProfileForm (cities→Photon, topics→tags, typed links, photo→StorageProvider)
                                  ↓ publish (rules enforce required fields)
                            speakers/{uid}
                                  ↓
       HomePage useSpeakers() query (published==true && disabled==false)  [composite index]
                                  ↓ client-side faceted filter on cityTierTokens / topics / tier
                  SpeakerGrid|SpeakerList (A/B via directory_layout) → SpeakerCard
                                  ↓
                              SpeakerPage → ReportButton (auth-gated) → reports/{id}
```

## Photon Integration (`lib/photon.ts`)

```typescript
const BASE = 'https://photon.komoot.io/api';

export async function searchCities(q: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q,
    limit: '6',
    lang: 'en',
    // bias toward populated places; client still filters to city-like results
    osm_tag: 'place:city',
  });
  const res = await fetch(`${BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  return res.json(); // GeoJSON FeatureCollection
}
```

Rules of engagement: **debounce ≥300ms**, abort in-flight requests, **cache** by query string, fall back to bundled `public/data/cities.json` if Photon fails or `enable_city_autocomplete` is false. Be a fair-use citizen (ADR 0003). Photon `osm_tag` also accepts `place:town`; include both for small-town coverage.

## Storage Abstraction (`lib/storage/`)

```typescript
// types.ts
export interface StorageProvider {
  uploadPhoto(uid: string, file: Blob): Promise<string>; // returns public URL
  deletePhoto(uid: string): Promise<void>;
}
// index.ts: read Remote Config `photo_storage_backend` ("supabase" | "firebase"),
// return the matching provider. Nothing else imports a storage SDK directly.
```

See task 07 + ADR 0004.

## Observability Abstraction (`lib/error-tracker.ts`)

`ErrorProvider { captureException, setUser }`. `SentryProvider` (primary) + `AnalyticsProvider` (logs `exception` event). `errorTracker` fans out. Nothing imports Sentry/Analytics directly for errors. See ADR 0002 + task 13.

## Routing

```
/               → HomePage (public directory)
/login          → LoginPage
/profile/edit   → ProfileEditPage (protected)
/speaker/:uid   → SpeakerPage (public)
```

## Scale notes (post-MVP)
- Client fetch-all + in-memory filter is fine to ~hundreds of speakers (≈1 read/speaker/visit; Spark cap 50k reads/day). Beyond that: paginate or add full-text search (Algolia/Typesense). Documented, not built.
