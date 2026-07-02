// SDK wrapper — one of the ONLY two modules allowed to import a storage SDK
// (ADR 0004). Excluded from coverage in vitest.config.ts; kept intentionally
// thin. The selector (./index) and the component contain the tested logic.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StorageProvider } from './types';

const BUCKET = 'photos';

// `createClient` is deferred to first use so importing this module never throws
// when `VITE_SUPABASE_*` are absent (e.g. when the Firebase backend is
// selected). `VITE_SUPABASE_*` are public anon values (safe to expose) but
// still env-managed — see .env.example and ADR 0004.
let client: SupabaseClient | null = null;
const getClient = (): SupabaseClient => {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase storage is not configured (VITE_SUPABASE_*).');
  }
  client = createClient(url, anonKey);
  return client;
};

/** Path is scoped by `uid/` so the RLS policy can restrict writes per owner. */
const objectPath = (uid: string): string => `${uid}/avatar.webp`;

export const supabaseStorage: StorageProvider = {
  async uploadPhoto(uid, file) {
    const path = objectPath(uid);
    const storage = getClient().storage.from(BUCKET);
    const { error } = await storage.upload(path, file, {
      upsert: true,
      contentType: 'image/webp',
    });
    if (error) throw error;
    return storage.getPublicUrl(path).data.publicUrl;
  },
  async deletePhoto(uid) {
    const { error } = await getClient()
      .storage.from(BUCKET)
      .remove([objectPath(uid)]);
    if (error) throw error;
  },
};
