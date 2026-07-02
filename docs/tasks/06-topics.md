# Task 06: Topics (Dynamic Tags) + Tag Requests

**Phase:** 3
**Estimated Effort:** 2.5 hours
**Dependencies:** 03 (schema/rules)

---

## Context

Topics drive filtering, so they come from a **dynamic `tags` Firestore collection** (not a hardcoded constant), each with i18n labels `{en, es}`. Speakers pick from existing tags and can request missing ones (`tag_requests`), which admins approve via console. `CHANGED:` from the earlier hardcoded `constants/topics.ts`.

## Goal

A `<TopicSelector>` that loads tags from Firestore, multi-selects by slug, shows translated labels, and offers a "request missing tag" flow gated by `enable_tag_requests`.

---

## Implementation Steps

### 6.1 Seed script — `scripts/seed-tags.ts`
- Uses Firebase Admin SDK (service account) to write seed tags (client writes to `tags` are blocked by rules).
- Seed slugs + labels:
  ```
  android {en:"Android", es:"Android"}, web {en:"Web", es:"Web"},
  cloud {en:"Cloud", es:"Cloud"}, ai-ml {en:"AI/ML", es:"IA/ML"},
  flutter, firebase, devops, security {en:"Security", es:"Seguridad"},
  data {en:"Data", es:"Datos"}, open-source {en:"Open Source", es:"Código Abierto"},
  community {en:"Community", es:"Comunidad"}, other {en:"Other", es:"Otro"}
  ```
- `createdAt: serverTimestamp()`. Idempotent (set with merge by slug).
- Document run command in README: `tsx scripts/seed-tags.ts` with `GOOGLE_APPLICATION_CREDENTIALS`.

### 6.2 Hook — `src/hooks/useTags.ts`
- Fetch `tags` once on app load; cache in context/state. Public read (rules allow).
- Expose `tags: {slug, label}[]`, `loading`, helper `labelFor(slug, locale)`.

### 6.3 Component — `src/components/profile/TopicSelector.tsx`
- Multi-select chips/checkboxes; display `label[currentLocale]`; store `topics: slug[]`.
- ≥1 required (part of publish gate).

### 6.4 Tag request flow
- If `enable_tag_requests`: "Can't find your topic? Request it" → input → `createTagRequest({ tag, requestedBy: uid })`.
- Fire `tag_requested` (task 16). Toast "submitted for review".
- De-dupe trivially (trim, lowercase) before submit; show pending state.

---

## Corner Cases & Gotchas
- **Slug vs label:** `topics` stores **slugs**; never store labels. Filtering + i18n depend on slugs.
- **Missing translation:** if a tag lacks `es`, fall back to `en` (and log a warning) — don't render `undefined`.
- **Stale tags after approval:** admin adds a tag via console; `useTags` only refetches on reload — acceptable for MVP (document). Optionally add a manual refresh.
- **Orphan slugs:** if a tag is removed, existing speakers may reference a missing slug → `labelFor` must handle unknown slugs gracefully (show the raw slug).
- **Seed idempotency:** re-running the seed must not duplicate or wipe `createdAt`.
- **`other` catch-all:** keep it last in ordering; don't let everyone default to it (UX nudge to pick specific topics).
- **Admin moderation is manual** (ADR 0005): `tag_requests.status` transitions happen in console; no in-app admin UI for MVP.

## Definition of Done
- [ ] `scripts/seed-tags.ts` seeds all 12 tags with `{en,es}` labels, idempotently.
- [ ] `useTags` loads tags (public read) and exposes `labelFor`.
- [ ] `<TopicSelector>` multi-selects by slug, shows translated labels, enforces ≥1.
- [ ] Tag request writes to `tag_requests` with `requestedBy==uid`; respects `enable_tag_requests`.
- [ ] Unknown/untranslated slugs handled gracefully.
- [ ] Component + axe tests (mock `useTags`).
