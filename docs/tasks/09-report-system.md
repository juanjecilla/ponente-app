# Task 09: Report System (Authenticated)

**Phase:** 5
**Estimated Effort:** 2 hours
**Dependencies:** 02 (auth), 03 (schema/rules)

---

## Context

Authenticated users can report a profile for moderation. Reports are **auth-gated** (`reportedBy = uid`) for accountability and spam control. There are **no Cloud Functions** (ADR 0005), so `reportCount` is not auto-incremented; an admin reviews the `reports` collection in the console and disables profiles manually. Gated by `enable_report_abuse`.

## Goal

A report button on the speaker page that requires sign-in, opens a modal with predefined reasons + optional comment, and writes to `reports`.

---

## Implementation Steps

### 9.1 Button — `src/components/shared/ReportButton.tsx`
- If not signed in: clicking prompts sign-in (redirect to `/login` preserving return path, or inline "sign in to report").
- If `enable_report_abuse` false: hide entirely.

### 9.2 Modal — `src/components/shared/ReportModal.tsx`
- Reasons (radio): `spam | fake | inappropriate | wrong-info` (translated labels).
- Optional comment (textarea, length-capped).
- Submit → `createReport({ reportedUid, reportedBy: uid, reason, comment })`.
- Fire `speaker_reported` (task 16). Success toast; close.
- Focus trap, Escape to close, return focus to trigger.

### 9.3 Rules
Already in task 03: `reports` create requires `reportedBy == auth.uid`; no client read.

---

## Corner Cases & Gotchas
- **Self-report / duplicate report:** MVP allows duplicates (no functions to dedupe). Optionally disable reporting your own profile in UI. Document that dedupe/rate-limit is post-MVP (functions).
- **No reportCount feedback:** UI must not claim a count; just confirm "reported, thanks". Admin sees raw docs (ADR 0005).
- **App Check:** report writes are also gated by App Check enforcement (task 17) — ensure debug token in dev/CI.
- **Abuse of reporting:** auth + App Check are the only guards on free tier; acceptable for MVP. Heavy abuse → add functions later.
- **a11y:** modal is a dialog (`role="dialog"`, `aria-modal`), labelled; radios grouped with fieldset/legend.
- **Comment safety:** store as plain text; never render unsanitized elsewhere (admin reads in console).

## Definition of Done
- [ ] Report requires sign-in; unauthenticated users routed to login.
- [ ] Modal: 4 reasons + optional comment; writes `reports` with `reportedBy==uid`.
- [ ] Respects `enable_report_abuse`.
- [ ] `speaker_reported` fires.
- [ ] Accessible dialog (focus trap, escape, labels); axe clean.
- [ ] Component test incl. unauthenticated path (mock useAuth).
