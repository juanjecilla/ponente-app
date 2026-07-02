import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  CityAvailability,
  Report,
  Speaker,
  Tag,
  TagRequest,
} from '../types';

/**
 * Derives the `cityTierTokens` array (`${key}:${tier}`, e.g. "madrid:free")
 * from a speaker's city availabilities. Pure — used for fast client-side
 * faceted filtering in the directory.
 */
export const deriveCityTierTokens = (cities: CityAvailability[]): string[] =>
  cities.map((c) => `${c.key}:${c.tier}`);

/**
 * Normalizes a city display name into the slug stored as `CityAvailability.key`
 * (lowercase, accent-stripped, non-alphanumerics collapsed to hyphens). Pure.
 * Only the first comma-separated segment (the city part) is considered.
 */
export const normalizeCityKey = (name: string): string =>
  (name.split(',')[0] ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * JS mirror of the Firestore `publishReady` security-rule function: a profile
 * may be published only with a name, at least one topic, city and contact link.
 * Pure — use for client-side gating; the rule remains the enforced boundary.
 */
export const isPublishReady = (d: Partial<Speaker>): boolean =>
  typeof d.name === 'string' &&
  d.name.length > 0 &&
  Array.isArray(d.topics) &&
  d.topics.length > 0 &&
  Array.isArray(d.cities) &&
  d.cities.length > 0 &&
  Array.isArray(d.contactLinks) &&
  d.contactLinks.length > 0;

// --- Typed converters -------------------------------------------------------
// Method shorthand keeps parameter checking bivariant so the strongly-typed
// app model satisfies the SDK's WithFieldValue/DocumentData converter contract.

function makeConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data) {
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data() as T;
    },
  };
}

export const speakerConverter = makeConverter<Speaker>();
export const tagConverter = makeConverter<Tag>();
export const reportConverter = makeConverter<Report>();
export const tagRequestConverter = makeConverter<TagRequest>();

// --- Typed collection references -------------------------------------------

export const speakersCollection = collection(db, 'speakers').withConverter(
  speakerConverter,
);
export const tagsCollection = collection(db, 'tags').withConverter(
  tagConverter,
);
export const reportsCollection = collection(db, 'reports').withConverter(
  reportConverter,
);
export const tagRequestsCollection = collection(
  db,
  'tag_requests',
).withConverter(tagRequestConverter);

// --- Data access ------------------------------------------------------------

export async function getSpeaker(uid: string): Promise<Speaker | null> {
  const snap = await getDoc(
    doc(db, 'speakers', uid).withConverter(speakerConverter),
  );
  return snap.exists() ? snap.data() : null;
}

/**
 * Creates or updates a speaker profile. On create, admin-only fields are forced
 * to safe defaults (`disabled`/`gdeVerified` false) and collections initialized;
 * `createdAt` is only stamped on create and never clobbered on update.
 * Callers should compute `cityTierTokens` via {@link deriveCityTierTokens}.
 */
export async function upsertSpeaker(
  uid: string,
  data: Partial<Speaker>,
): Promise<void> {
  const ref = doc(db, 'speakers', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      uid,
      published: false,
      disabled: false,
      gdeVerified: false,
      topics: [],
      cities: [],
      cityTierTokens: [],
      contactLinks: [],
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getPublishedSpeakers(): Promise<Speaker[]> {
  const q = query(
    speakersCollection,
    where('published', '==', true),
    where('disabled', '==', false),
  );
  return (await getDocs(q)).docs.map((d) => d.data());
}

export async function createTagRequest(
  data: Pick<TagRequest, 'tag' | 'requestedBy'>,
): Promise<void> {
  await addDoc(collection(db, 'tag_requests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function createReport(
  data: Omit<Report, 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
