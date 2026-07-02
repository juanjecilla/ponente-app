// SDK wrapper — one of the ONLY two modules allowed to import a storage SDK,
// and the ONLY place `getStorage()` may be called (ADR 0004 / CLAUDE.md).
// Excluded from coverage in vitest.config.ts; kept intentionally thin.
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from 'firebase/storage';
import { app } from '../firebase';
import type { StorageProvider } from './types';

// `getStorage()` is deferred to first use. A Spark-plan project has no bucket
// and would 402/403 on `getStorage()`, so we never call it merely by importing
// this module — only when the Firebase backend is both selected AND used.
let storage: FirebaseStorage | null = null;
const getStorageLazy = (): FirebaseStorage => (storage ??= getStorage(app));

const objectPath = (uid: string): string => `photos/${uid}`;

export const firebaseStorage: StorageProvider = {
  async uploadPhoto(uid, file) {
    const objectRef = ref(getStorageLazy(), objectPath(uid));
    await uploadBytes(objectRef, file, { contentType: 'image/webp' });
    return getDownloadURL(objectRef);
  },
  async deletePhoto(uid) {
    await deleteObject(ref(getStorageLazy(), objectPath(uid)));
  },
};
