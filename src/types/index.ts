import type { Timestamp } from 'firebase/firestore';

export type CostTier = 'free' | 'self-covered' | 'needs-expenses';
export type ContactType =
  'email' | 'linkedin' | 'twitter' | 'github' | 'website' | 'sessionize';
export type GdeStatus = 'none' | 'aspiring' | 'current';

export interface CityAvailability {
  name: string; // canonical Photon display name, e.g. "Madrid, Spain"
  key: string; // normalized slug for matching, e.g. "madrid"
  lat: number;
  lng: number;
  tier: CostTier;
}

export interface ContactLink {
  type: ContactType;
  value: string; // email address OR url, validated per type
}

export interface Speaker {
  uid: string;
  name: string;
  photo?: string; // URL from whichever StorageProvider is active
  bio?: string;
  topics: string[]; // tag slugs (FK → tags/{slug})
  cities: CityAvailability[];
  cityTierTokens: string[]; // derived: `${key}:${tier}`, e.g. "madrid:free"
  contactLinks: ContactLink[];
  gdgChapter?: string;
  languages?: string[];
  gdeStatus?: GdeStatus; // self-reported, shown as "unverified"
  gdeVerified: boolean; // admin-only (console). Client cannot write.
  talkLink?: string;
  published: boolean;
  disabled: boolean; // admin-only (console). Client cannot write.
  reportCount?: number; // admin-only (console). Not maintained by client. ADR 0005.
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Tag {
  label: { en: string; es: string };
  createdAt: Timestamp;
}

export interface TagRequest {
  tag: string; // raw requested label
  requestedBy: string; // uid
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected'; // admin sets via console
}

export interface Report {
  reportedUid: string;
  reportedBy: string; // uid — REQUIRED (auth-gated)
  reason: 'spam' | 'fake' | 'inappropriate' | 'wrong-info';
  comment?: string;
  createdAt: Timestamp;
}
