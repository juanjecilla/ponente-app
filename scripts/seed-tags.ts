/**
 * One-off Firestore seed for the `tags` collection.
 *
 * The `tags` security rule blocks all client writes, so seeding must go through
 * the Firebase Admin SDK (which bypasses rules). This script is NOT part of the
 * app bundle and is excluded from coverage.
 *
 * Usage:
 *   - Against the local emulator (no credentials needed): set the env vars
 *     FIRESTORE_EMULATOR_HOST (e.g. localhost, port 8080) and
 *     GOOGLE_CLOUD_PROJECT, then run: npx tsx scripts/seed-tags.ts
 *   - Against a real project: point GOOGLE_APPLICATION_CREDENTIALS at a
 *     service-account JSON, then run: npx tsx scripts/seed-tags.ts
 *
 * Idempotent: writes use `merge: true` keyed by slug, so re-running only
 * upserts labels and never duplicates documents.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

interface SeedTag {
  slug: string;
  label: { en: string; es: string };
}

export const SEED_TAGS: SeedTag[] = [
  { slug: 'android', label: { en: 'Android', es: 'Android' } },
  { slug: 'web', label: { en: 'Web', es: 'Web' } },
  { slug: 'cloud', label: { en: 'Cloud', es: 'Cloud' } },
  { slug: 'ai-ml', label: { en: 'AI / ML', es: 'IA / ML' } },
  { slug: 'flutter', label: { en: 'Flutter', es: 'Flutter' } },
  { slug: 'firebase', label: { en: 'Firebase', es: 'Firebase' } },
  { slug: 'devops', label: { en: 'DevOps', es: 'DevOps' } },
  { slug: 'security', label: { en: 'Security', es: 'Seguridad' } },
  { slug: 'data', label: { en: 'Data', es: 'Datos' } },
  {
    slug: 'open-source',
    label: { en: 'Open Source', es: 'Código abierto' },
  },
  { slug: 'community', label: { en: 'Community', es: 'Comunidad' } },
  { slug: 'other', label: { en: 'Other', es: 'Otro' } },
];

async function main(): Promise<void> {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (credsPath && !usingEmulator) {
    initializeApp({
      credential: cert(
        JSON.parse(
          // Path comes from a trusted operator-provided env var.
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          readFileSync(credsPath, 'utf8'),
        ) as Record<string, string>,
      ),
    });
  } else {
    // Emulator or application-default credentials.
    initializeApp();
  }

  const db = getFirestore();
  const batch = db.batch();
  for (const { slug, label } of SEED_TAGS) {
    batch.set(
      db.collection('tags').doc(slug),
      { label, createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();

  const target = usingEmulator
    ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`
    : 'project';
  console.log(`Seeded ${SEED_TAGS.length} tags to ${target}.`);
}

main().catch((err: unknown) => {
  console.error('Failed to seed tags:', err);
  process.exitCode = 1;
});
