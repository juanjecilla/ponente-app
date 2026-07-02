# Task 03: Firestore Schema, Security Rules & Indexes

**Phase:** 3
**Estimated Effort:** 1.5 hours
**Dependencies:** 01

---

## Context

All data lives in Firestore: `speakers`, `tags`, `tag_requests`, `reports`. This is the **richer reconciled schema** (typed contact links, `cityTierTokens`, dynamic tags, `gdeVerified`, authenticated reports, no client-writable admin fields). Rules enforce the publish gate and lock admin fields server-side. See `docs/ARCHITECTURE.md` for the canonical version.

## Goal

TypeScript types, Firestore helpers, security rules, and a composite index deployed and verified against the emulator/console.

---

## Implementation Steps

### 3.1 Types — `src/types/index.ts`
```typescript
import { Timestamp } from 'firebase/firestore';

export type CostTier = 'free' | 'self-covered' | 'needs-expenses';
export type ContactType = 'email' | 'linkedin' | 'twitter' | 'github' | 'website' | 'sessionize';
export type GdeStatus = 'none' | 'aspiring' | 'current';

export interface CityAvailability { name: string; key: string; lat: number; lng: number; tier: CostTier; }
export interface ContactLink { type: ContactType; value: string; }

export interface Speaker {
  uid: string;
  name: string;
  photo?: string;
  bio?: string;
  topics: string[];                 // tag slugs
  cities: CityAvailability[];
  cityTierTokens: string[];         // derived `${key}:${tier}`
  contactLinks: ContactLink[];
  gdgChapter?: string;
  languages?: string[];
  gdeStatus?: GdeStatus;
  gdeVerified: boolean;             // admin-only
  talkLink?: string;
  published: boolean;
  disabled: boolean;                // admin-only
  reportCount?: number;             // admin-only, not client-written (ADR 0005)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Tag { label: { en: string; es: string }; createdAt: Timestamp; }
export interface TagRequest { tag: string; requestedBy: string; createdAt: Timestamp; status: 'pending' | 'approved' | 'rejected'; }
export interface Report {
  reportedUid: string;
  reportedBy: string;               // required (auth)
  reason: 'spam' | 'fake' | 'inappropriate' | 'wrong-info';
  comment?: string;
  createdAt: Timestamp;
}
```

### 3.2 Helpers — `src/lib/firestore.ts`
```typescript
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Speaker, TagRequest, Report } from '../types';

export async function getSpeaker(uid: string): Promise<Speaker | null> {
  const snap = await getDoc(doc(db, 'speakers', uid));
  return snap.exists() ? (snap.data() as Speaker) : null;
}

// Caller computes cityTierTokens from cities before saving (see deriveCityTierTokens).
export async function upsertSpeaker(uid: string, data: Partial<Speaker>) {
  const ref = doc(db, 'speakers', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      uid, published: false, disabled: false, gdeVerified: false,
      topics: [], cities: [], cityTierTokens: [], contactLinks: [],
      ...data,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
}

export async function getPublishedSpeakers(): Promise<Speaker[]> {
  const q = query(
    collection(db, 'speakers'),
    where('published', '==', true),
    where('disabled', '==', false),
  );
  return (await getDocs(q)).docs.map((d) => d.data() as Speaker);
}

export async function createTagRequest(data: Pick<TagRequest, 'tag' | 'requestedBy'>) {
  await addDoc(collection(db, 'tag_requests'), { ...data, status: 'pending', createdAt: serverTimestamp() });
}

export async function createReport(data: Omit<Report, 'createdAt'>) {
  await addDoc(collection(db, 'reports'), { ...data, createdAt: serverTimestamp() });
}
```

### 3.3 Token helper — `src/lib/firestore.ts` (or `lib/city.ts`)
```typescript
import type { CityAvailability } from '../types';
export const deriveCityTierTokens = (cities: CityAvailability[]) =>
  cities.map((c) => `${c.key}:${c.tier}`);
```

### 3.4 Security rules — `firestore.rules`
Use the full rule set from `docs/ARCHITECTURE.md` (isOwner, publishReady, adminFieldsUnchanged; speakers/tags/tag_requests/reports). Key guarantees:
- Public read only `published && !disabled`; owner reads own always.
- Publish only when required fields present (`publishReady`).
- `disabled`, `gdeVerified`, `reportCount` unwritable by clients.
- `tag_requests`/`reports` create requires `requestedBy/reportedBy == auth.uid`; no client reads.

### 3.5 Indexes — `firestore.indexes.json`
Composite index on `speakers (published ASC, disabled ASC)` (see `ARCHITECTURE.md`).

### 3.6 Wire `firebase.json` + deploy
```json
"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
```
`firebase deploy --only firestore:rules,firestore:indexes`.

### 3.7 Seed tags
Tag seeding lives in task 06 (`scripts/seed-tags.ts`). The `tags` rules already block client writes, so seed via Admin SDK or console.

---

## Corner Cases & Gotchas
- **Composite index:** the two-equality directory query needs it; without it Firestore throws and prints a create-URL. Ship `firestore.indexes.json` so it deploys with CI.
- **`serverTimestamp()` on create vs update:** never overwrite `createdAt` on update — only set it in the create branch.
- **Admin-field immutability:** `adminFieldsUnchanged()` compares `request.resource.data` to `resource.data`; on **create** there is no `resource`, so the create branch forces safe defaults instead.
- **`reportCount` absent:** use `.get('reportCount', 0)` in rules so docs without the field don't break the comparison.
- **Map/array validation depth:** rules can't deeply validate every `contactLinks` item cheaply; keep value-format validation client-side + lightweight rule checks (lists non-empty). Document this trust boundary.
- **Rules tests:** add `@firebase/rules-unit-testing` cases (see `docs/TESTING.md`).

## Definition of Done
- [ ] Types compile under strict.
- [ ] `getPublishedSpeakers()` returns only `published && !disabled`.
- [ ] `upsertSpeaker()` creates with safe admin defaults, updates without clobbering `createdAt`.
- [ ] Rules + indexes deploy successfully.
- [ ] Emulator tests: public can't read unpublished/disabled; non-owner can't write; client can't set `disabled`/`gdeVerified`; publish blocked without required fields; report/tag-request require matching uid.
