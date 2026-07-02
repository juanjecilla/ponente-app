# ADR 0004: Photo Storage Abstraction (Supabase default, Firebase behind a flag)

**Status:** Accepted (2026-06)

## Context
Speaker photos need a storage backend with public read URLs and client-side upload. The original plan used Firebase Storage. Research found that **Cloud Storage for Firebase requires the Blaze (pay-as-you-go) plan as of 2026-02-03** — Spark projects cannot provision a bucket and get `402/403`. Ponente's hard constraint is **strictly free, no card on file**. Firebase Storage therefore can't be the default.

## Decision
Introduce a **StorageProvider abstraction** and ship two implementations, selected at runtime by a Remote Config flag.

```typescript
// lib/storage/types.ts
export interface StorageProvider {
  uploadPhoto(uid: string, file: Blob): Promise<string>; // returns public URL
  deletePhoto(uid: string): Promise<void>;
}
```
- **`SupabaseStorageProvider` (default)** — Supabase Storage free tier (~1 GB), public bucket, client upload with the anon key + RLS policy restricting writes to the authenticated user's `photos/{uid}` path.
- **`FirebaseStorageProvider`** — Firebase Storage SDK (`photos/{uid}`), used when the project is on Blaze.
- **Selector** `lib/storage/index.ts` reads Remote Config `photo_storage_backend` (`"supabase"` | `"firebase"`, default `"supabase"`). Nothing else imports a storage SDK directly — mirrors the `ErrorTracker` pattern (ADR 0002).

## Consequences
- ✅ Fully free default; one flag flip to switch backends without code changes if the project later upgrades to Blaze.
- ✅ Testable: `StorageProvider` is mockable; SDK wrappers excluded from coverage.
- ⚠️ Adds a non-Google dependency (Supabase) + one secret (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- ⚠️ Two backends to keep in sync; the interface keeps surface area tiny (upload/delete only).
- ⚠️ Supabase RLS must mirror the "owner writes own path" guarantee; App Check does not cover Supabase.

## Alternatives considered
- **Firebase Storage only** — needs Blaze; violates the free constraint.
- **Generated avatars only (DiceBear/initials)** — zero backend, but loses real photos; kept as the natural empty-state when no photo is set.
- **Cloudinary free tier** — generous, but unsigned uploads + transformations add more surface than Supabase's simple bucket.
