# Task 18: A/B Testing (Directory Layout)

**Phase:** 10
**Estimated Effort:** 1 hour
**Dependencies:** 08 (grid/list), 14 (Remote Config), 16 (Analytics goal metric)

---

## Context

An A/B test compares directory layouts (grid vs list) to see which drives more profile views. It uses the Remote Config `directory_layout` parameter as the experiment variable and `speaker_profile_viewed` as the goal metric. Requires Google Analytics linked to the Firebase project.

## Goal

`directory_layout_test` experiment configured; HomePage renders grid/list per the resolved value.

---

## Implementation Steps

### 18.1 Link GA
- Ensure Google Analytics is linked to the Firebase project (needed for experiments).

### 18.2 Experiment (console)
- Create `directory_layout_test`:
  - Variable: Remote Config `directory_layout`.
  - Control: `grid`. Treatment: `list`.
  - Goal metric: `speaker_profile_viewed` event count.
  - Audience/exposure: default (all users), reasonable split.

### 18.3 Render
- HomePage reads `getFlag('directory_layout')` → `<SpeakerGrid>` or `<SpeakerList>` (task 08). Default `grid` if unresolved.

---

## Corner Cases & Gotchas
- **Default before fetch:** if Remote Config hasn't activated, render grid (in-SDK default) to avoid flicker/blank.
- **Layout switch flicker:** activate Remote Config before first directory render where possible; otherwise accept one reconcile.
- **Both layouts must be a11y-equivalent** (same data, same links) so the experiment measures layout, not broken markup.
- **Goal metric reliability:** depends on `speaker_profile_viewed` firing on every profile view (task 16).
- **Low traffic:** at MVP volume the experiment may never reach significance — that's fine; it's a showcase. Document.
- **Don't gate behind App Check failure:** Remote Config fetch needs App Check token if enforced (task 17).

## Definition of Done
- [ ] GA linked; `directory_layout_test` created with grid/list + goal `speaker_profile_viewed`.
- [ ] HomePage renders the assigned layout; defaults to grid pre-activation.
- [ ] Both layouts are functionally + a11y equivalent.
