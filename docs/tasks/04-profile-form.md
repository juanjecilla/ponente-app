# Task 04: Speaker Profile Form

**Phase:** 3
**Estimated Effort:** 4 hours
**Dependencies:** 02 (auth), 03 (schema), 05 (city search), 06 (topics), 07 (photo). Build the form shell first; slot sub-components as they land.

---

## Context

The profile form is where speakers compose their `speakers/{uid}` doc and publish. It composes four feature sub-components (city, topics, contact links, photo) plus simple fields, gated by `enable_speaker_registration`.

## Goal

`ProfileEditPage` lets an authenticated speaker create/edit all fields, validates required fields, derives `cityTierTokens`, saves to Firestore, and gates the publish toggle (UI + server rules).

---

## Implementation Steps

### 4.1 Page + load — `src/pages/ProfileEditPage.tsx`
- Protected route. On mount, `getSpeaker(uid)`; prefill or start empty.
- If `enable_speaker_registration` is false (task 14), show a "registration paused" message and hide the form.
- Render `<ProfileCompletionBanner>` (task 19) when `published == false`.

### 4.2 Form fields — `src/components/profile/ProfileForm.tsx`
- **Required:** Name (text); Topics (`<TopicSelector>`, task 06); Cities (`<CityAvailabilityInput>`, task 05); Contact links (`<ContactLinksInput>`, task 09-shared component / built here, ≥1).
- **Optional:** Bio (textarea, char counter); GDG chapter (text); Languages (multi-select); GDE status (`none|aspiring|current`, labeled "self-reported, unverified", gated by `enable_gde_status`); Talk link (URL or "Not yet" skip); Photo (`<PhotoUpload>`, task 07, gated by `enable_photo_upload`).
- **Read-only:** `gdeVerified` badge (admin-set; display only).

### 4.3 Typed contact links — `src/components/profile/ContactLinksInput.tsx`
- Row = type selector (`email|linkedin|twitter|github|website|sessionize`) + value input + remove. "Add link" appends a row.
- Per-type validation: `email` → email regex; others → URL (`https?://`), with helper hints (e.g. LinkedIn expects a profile URL).
- Constant `src/constants/contactTypes.ts` holds type metadata (icon, label key, validator, placeholder).

### 4.4 Save
- On save: validate; compute `cityTierTokens = deriveCityTierTokens(cities)`; `upsertSpeaker(uid, data)`.
- Fire `speaker_registered` on first publish (createdAt≈now) or `profile_updated` otherwise (task 16).
- Surface save errors via `errorTracker.captureException` + user-visible toast.

### 4.5 Publish toggle — `src/components/profile/PublishToggle.tsx`
- Disabled until required fields valid (name, ≥1 topic, ≥1 city, ≥1 contact link).
- Writes `published`. Server rule re-enforces the gate — handle a rejected publish gracefully.

---

## Corner Cases & Gotchas
- **Required-field parity:** UI gate and `publishReady()` rule must match exactly, else a UI-allowed publish gets rejected. Centralize the predicate and reuse.
- **Unpublish always allowed:** rule permits `published==false` regardless of fields; don't block unpublishing.
- **cityTierTokens drift:** recompute tokens on every save from `cities`; never hand-edit. Duplicate city+tier → dedupe tokens.
- **Talk link "Not yet":** store `undefined`/omit, not an empty string.
- **Languages multi-select:** keep a small controlled list or free tags; if free, trim/normalize.
- **Optimistic vs server time:** `createdAt`/`updatedAt` are server timestamps; for the `speaker_registered` "first publish" check, compare against a locally tracked "was previously published" flag rather than timestamps to avoid clock skew.
- **a11y:** label every input; group contact rows with fieldset/legend; announce validation errors via `aria-describedby`.
- **Flag-off rendering:** when `enable_photo_upload`/`enable_gde_status` are false, omit the section entirely (don't just disable).

## Definition of Done
- [ ] Create + edit flows persist all fields.
- [ ] Required-field validation matches the server publish gate.
- [ ] `cityTierTokens` derived correctly (deduped) on save.
- [ ] Typed contact links validate per type; ≥1 enforced.
- [ ] Publish toggle gated in UI; server rejection handled.
- [ ] Optional sections respect their Remote Config flags.
- [ ] Analytics events fire; errors captured.
- [ ] Component + axe tests for ProfileForm and ContactLinksInput.
