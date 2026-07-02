# ADR 0006: No Firebase In-App Messaging — Custom Banner

**Status:** Accepted (2026-06)

## Context
The plan included Firebase In-App Messaging to show a "complete your profile" prompt to speakers with `published == false`. Research of the Firebase supported-platforms matrix confirmed **In-App Messaging has no Web SDK** — it is available only on Apple and Android platforms. The feature is therefore impossible to ship on this React web app.

## Decision
Drop the In-App Messaging SDK entirely. Implement the same UX with a **custom `<ProfileCompletionBanner>`** React component:
- Rendered on the profile edit page (and optionally globally for signed-in users) when the speaker's `published == false`.
- Lists the missing required fields (name, ≥1 topic, ≥1 city, ≥1 contact link) with a CTA that scrolls to / focuses the first incomplete section.
- Dismissible per session (local state); no Firebase dependency.
- Gated by no special flag (it's plain UI), but respects `enable_speaker_registration`.

## Consequences
- ✅ Achievable on web, fully testable, no SDK or console message setup.
- ✅ More control over copy, i18n, and a11y than the hosted product would give.
- ⚠️ Loses the console-driven targeting/scheduling of In-App Messaging — not needed for this single, deterministic prompt.

## Alternatives considered
- **Firebase In-App Messaging** — no web support (the reason for this ADR).
- **FCM web push** — different product (requires notification permission + service worker); overkill for an in-page prompt.
