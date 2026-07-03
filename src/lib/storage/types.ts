/**
 * Photo storage abstraction (ADR 0004).
 *
 * A `StorageProvider` hides the concrete backend (Supabase by default, Firebase
 * Storage behind a Remote Config flag). NOTHING outside `src/lib/storage`
 * imports a storage SDK directly — callers go through {@link StorageProvider}
 * obtained from `getStorageProvider()` in `./index`.
 */
export interface StorageProvider {
  /** Upload a speaker's avatar and return its public URL. */
  uploadPhoto(uid: string, file: Blob): Promise<string>;
  /** Delete a speaker's avatar (best-effort; may no-op if already absent). */
  deletePhoto(uid: string): Promise<void>;
}
