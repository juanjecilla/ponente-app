import { getPhotoStorageBackend } from '../remote-config';
import { supabaseStorage } from './supabase';
import { firebaseStorage } from './firebase';
import type { StorageProvider } from './types';

export type { StorageProvider } from './types';

/**
 * Return the active {@link StorageProvider} selected by the Remote Config
 * `photo_storage_backend` flag (`"supabase"` default | `"firebase"`).
 *
 * Both providers are statically imported, but `getStorage()` inside the
 * Firebase provider is deferred to first use, so importing this selector never
 * provisions Firebase Storage on a Spark-plan project (ADR 0004).
 */
export function getStorageProvider(): StorageProvider {
  return getPhotoStorageBackend() === 'firebase'
    ? firebaseStorage
    : supabaseStorage;
}
