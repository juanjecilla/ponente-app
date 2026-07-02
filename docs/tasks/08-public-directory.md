# Task 08: Public Directory + Speaker Page

**Phase:** 4
**Estimated Effort:** 4 hours
**Dependencies:** 03 (schema), 06 (tags for filter labels), 05 (city filter reuse)

---

## Context

The directory is the organizer-facing surface: no account needed. At MVP scale (~tens of speakers) we fetch all `published && !disabled` speakers in one query and filter in memory by city, topic, and tier. Layout is A/B-tested (`directory_layout`).

## Goal

`HomePage` lists speakers with faceted filters and proper empty/loading/error states; `SpeakerPage` shows a public profile with contact links and a report button. Gated by `enable_public_directory`.

---

## Implementation Steps

### 8.1 Data hook — `src/hooks/useSpeakers.ts`
- Call `getPublishedSpeakers()` once (task 03); wrap in `speakers_fetch` perf trace (task 15).
- Expose `speakers`, `loading`, `error`. Capture errors via `errorTracker`.

### 8.2 Filtering — `src/lib/filter.ts` (pure, unit-tested)
```typescript
// city filter by normalized key; tier filter; topic filter by slug
// cityTierTokens hold `${key}:${tier}` → match "key:*" (any tier) or "key:tier".
```
- City: reuse `normalizeCityKey` (task 05); match against `cityTierTokens` prefix.
- Topic: speaker.topics ∩ selectedSlugs (AND or OR — default OR, document choice).
- Tier: any city with selected tier (or combined city+tier token match).
- Fire `speaker_searched` on filter change (debounced; task 16).

### 8.3 Filters UI — `src/components/directory/SpeakerFilters.tsx`
- City input reusing the Photon-backed combobox from task 05 (search → pick → filter by key).
- Topic multi-select (translated labels via `useTags`).
- Tier checkboxes (`free|self-covered|needs-expenses`).
- "Clear filters"; show active-filter chips; `aria-live` result count.

### 8.4 Layout — Grid/List (A/B)
- `SpeakerGrid.tsx` (`directory_layout="grid"`) and `SpeakerList.tsx` (`"list"`); HomePage reads the flag (task 18) and renders one. Default grid.

### 8.5 Card — `src/components/directory/SpeakerCard.tsx`
- Photo/initials avatar, name, topic chips, cities + tier badges, contact-link icons (typed), GDE badge (`gdeVerified` ⇒ "GDE"; else self-reported "aspiring/current" shown as unverified). Links to `/speaker/:uid`.

### 8.6 Speaker page — `src/pages/SpeakerPage.tsx`
- `getSpeaker(uid)`; if not found / not published / disabled → 404-style "not available".
- Full profile: bio, all cities+tiers, topics, typed contact links (open in new tab, `rel="noopener noreferrer"`), talk link, languages, GDG chapter, GDE status.
- `<ReportButton>` (task 09). Fire `speaker_profile_viewed` on mount (task 16).

### 8.7 States
- **Loading:** skeletons. **Empty (no speakers):** friendly CTA to register. **Empty (filters):** "no matches, adjust filters". **Error:** retry affordance.

---

## Corner Cases & Gotchas
- **Composite index required** for the two-equality query (task 03) — directory breaks without it.
- **Scale:** fetch-all is fine to hundreds (≈1 read/speaker/visit; 50k/day cap). Document pagination/search as post-MVP; don't prematurely optimize.
- **Direct URL to unpublished/disabled speaker:** `SpeakerPage` must re-check `published && !disabled` (rules also block public read of disabled — handle the permission-denied gracefully as "not available").
- **City filter matching:** rely on normalized `key`; "Madrid" must match `madrid:free` etc. Test accented cities.
- **Topic AND vs OR:** pick one, document; OR is friendlier for discovery.
- **`speaker_searched` spam:** debounce so each keystroke doesn't fire an event.
- **External links safety:** all contact links `target="_blank" rel="noopener noreferrer"`; validate scheme to avoid `javascript:`.
- **A/B fallback:** if Remote Config not fetched yet, default to grid (in-SDK default).
- **a11y:** filter controls labeled; cards are real links; result count announced.

## Definition of Done
- [ ] Directory fetches once, filters in memory by city/topic/tier.
- [ ] Filtering logic is pure and unit-tested (incl. accented city, token matching).
- [ ] Grid/List both render; layout chosen by `directory_layout` (default grid).
- [ ] SpeakerCard + SpeakerPage render typed links safely; GDE badge logic correct.
- [ ] Loading/empty/error/no-match states all present.
- [ ] Direct access to unavailable speaker handled.
- [ ] Respects `enable_public_directory`; analytics events fire (debounced search).
- [ ] axe clean on HomePage + SpeakerPage.
