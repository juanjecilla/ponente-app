# Task 07: Photo Upload (Storage Abstraction)

**Phase:** 3
**Estimated Effort:** 3 hours
**Dependencies:** 03 (schema), 14 (Remote Config flag) — provide a default if 14 not ready.
**See:** ADR 0004.

---

## Context

Speaker photos need a free backend. **Firebase Storage requires Blaze since 2026-02-03**, so the default is **Supabase Storage** (free ~1 GB), with a **Firebase Storage** implementation kept behind a flag for if/when the project upgrades. A `StorageProvider` abstraction hides both; nothing else imports a storage SDK. Selection via Remote Config `photo_storage_backend` (`"supabase"` default | `"firebase"`).

## Goal

`<PhotoUpload>` resizes client-side, validates, uploads via the active `StorageProvider`, stores the URL on the speaker doc, and supports remove. Gated by `enable_photo_upload`.

---

## Implementation Steps

### 7.1 Interface — `src/lib/storage/types.ts`
```typescript
export interface StorageProvider {
  uploadPhoto(uid: string, file: Blob): Promise<string>; // public URL
  deletePhoto(uid: string): Promise<void>;
}
```

### 7.2 Supabase provider — `src/lib/storage/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import type { StorageProvider } from './types';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const BUCKET = 'photos';

export const supabaseStorage: StorageProvider = {
  async uploadPhoto(uid, file) {
    const path = `${uid}/avatar.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: 'image/webp' });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  },
  async deletePhoto(uid) {
    const { error } = await supabase.storage.from(BUCKET).remove([`${uid}/avatar.webp`]);
    if (error) throw error;
  },
};
```
- Supabase console: create public bucket `photos`; **RLS policy**: authenticated users may write/delete only under their own `uid/` prefix (`(storage.foldername(name))[1] = auth.uid()`); public read.
- Supabase auth: client uploads need a Supabase session. For MVP simplest path: **public bucket + anon insert policy scoped by path**, OR bridge Firebase auth → Supabase via a signed JWT. **Decision for MVP:** use an anon-writable bucket constrained by an Edge policy on path prefix; document the (small) trust gap, since App Check doesn't cover Supabase. If stricter auth is required, defer to Firebase backend (Blaze) via the flag.

### 7.3 Firebase provider — `src/lib/storage/firebase.ts`
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../firebase';
import type { StorageProvider } from './types';

// Only used when project is on Blaze and flag = "firebase".
const storage = getStorage(app);
export const firebaseStorage: StorageProvider = {
  async uploadPhoto(uid, file) {
    const r = ref(storage, `photos/${uid}`);
    await uploadBytes(r, file, { contentType: 'image/webp' });
    return getDownloadURL(r);
  },
  async deletePhoto(uid) { await deleteObject(ref(storage, `photos/${uid}`)); },
};
```
- Firebase Storage rule (when used): `allow read: if true; allow write: if request.auth.uid == uid && request.resource.size < 2*1024*1024;`

### 7.4 Selector — `src/lib/storage/index.ts`
```typescript
import { getFlag } from '../remote-config';
import { supabaseStorage } from './supabase';
import type { StorageProvider } from './types';

export function getStorageProvider(): StorageProvider {
  const backend = getFlag('photo_storage_backend'); // "supabase" | "firebase"
  if (backend === 'firebase') return require('./firebase').firebaseStorage; // lazy to avoid getStorage() on Spark
  return supabaseStorage;
}
```
> **Lazy-load** the Firebase provider so `getStorage()` is never called on a Spark project (would 402/403). Prefer dynamic `import()` over `require` in the real impl.

### 7.5 Client resize — `src/lib/image.ts`
- Canvas resize to **400×400** (cover/crop), output **WebP** (fallback JPEG), quality ~0.8.
- **EXIF orientation:** read orientation and rotate before drawing (or use `createImageBitmap(file, { imageOrientation: 'from-image' })`).
- Validate **before** resize: type in `{jpeg,png,webp}`, size ≤ 2 MB.

### 7.6 Component — `src/components/profile/PhotoUpload.tsx`
- File input (accept images), preview, upload progress, remove button.
- On upload: resize → `getStorageProvider().uploadPhoto(uid, blob)` → set `photo` URL on form.
- `photo_upload` perf trace wraps resize→upload (task 15).
- Empty state: generated initials avatar (no backend) when `photo` unset.

---

## Corner Cases & Gotchas
- **Spark + Firebase provider:** never instantiate `getStorage()` unless flag=`firebase`; lazy import (7.4).
- **Supabase ≠ App Check:** App Check protects Firebase only. The Supabase bucket relies on its own RLS + path scoping; document the trust boundary and keep the bucket policy tight.
- **Orphaned photos:** on remove or backend switch, old objects may linger (esp. across backends). MVP: best-effort delete; document that switching backends doesn't migrate existing URLs.
- **Stored URL vs backend:** `photo` is an absolute URL, so reads work regardless of current flag; only new uploads use the active backend.
- **EXIF rotation:** phone photos commonly need orientation fix — test a sideways iPhone JPEG.
- **WebP support:** all modern browsers OK; if targeting very old browsers, fall back to JPEG.
- **CORS for `<img>`:** public URLs render fine; if you ever canvas-read them, set crossorigin.
- **Secrets:** `VITE_SUPABASE_*` are public anon keys (safe to expose) but still env-managed; document.

## Definition of Done
- [ ] `StorageProvider` interface + Supabase + Firebase implementations.
- [ ] Selector reads `photo_storage_backend`; Firebase provider lazy-loaded (no `getStorage()` on Spark).
- [ ] Client resize to 400×400 WebP with EXIF orientation fix; type/size validated.
- [ ] Upload sets `photo` URL; remove clears it; initials avatar empty state.
- [ ] Supabase bucket + RLS path policy documented and applied.
- [ ] Respects `enable_photo_upload`; `photo_upload` trace wired.
- [ ] Unit tests: image validation/resize logic, selector flag switch (mock Remote Config).
