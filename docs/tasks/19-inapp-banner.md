# Task 19: Profile Completion Banner (replaces In-App Messaging)

**Phase:** 10
**Estimated Effort:** 1 hour
**Dependencies:** 04 (profile form/state)
**See:** ADR 0006.

---

## Context

Firebase **In-App Messaging has no Web SDK**, so the planned "complete your profile" prompt is built as a custom React component instead. It nudges signed-in speakers whose profile is `published == false` to finish required fields — with full control over copy, i18n, and a11y.

## Goal

A `<ProfileCompletionBanner>` shown to unpublished speakers, listing missing required fields with a CTA, dismissible per session.

---

## Implementation Steps

### 19.1 Component — `src/components/shared/ProfileCompletionBanner.tsx`
- Props: the current speaker draft (or read from profile context).
- Compute missing required fields using the same predicate as the publish gate (name, ≥1 topic, ≥1 city, ≥1 contact link) — reuse the shared `publishReady`-equivalent helper (task 04).
- Render a banner listing what's missing; CTA scrolls to / focuses the first incomplete section.
- Dismissible (local/session state); reappears next session if still unpublished.
- All copy via `t()` (`banner.*` keys).

### 19.2 Placement
- On `ProfileEditPage` (top). Optionally globally for signed-in unpublished speakers.
- Respect `enable_speaker_registration` (hide if registration paused).

---

## Corner Cases & Gotchas
- **Single source of truth for "required":** reuse the publish-gate predicate so the banner never disagrees with what actually blocks publishing.
- **Don't show when published** or when the user has no profile intent (e.g. pure organizer who signed in only to report) — only show on profile surfaces.
- **Dismissal scope:** per session (don't persist forever, or a still-incomplete profile is silently forgotten).
- **a11y:** use `role="status"`/`aria-live="polite"` (informational, not an alert); CTA is a real button moving focus.
- **i18n length:** ES copy longer — test layout.

## Definition of Done
- [ ] Banner shows for signed-in, unpublished speakers; hidden when published.
- [ ] Lists missing required fields using the shared publish-gate predicate.
- [ ] CTA focuses the first incomplete section; dismissible per session.
- [ ] i18n + a11y (`aria-live`) correct.
- [ ] Component test for show/hide + missing-field computation.
