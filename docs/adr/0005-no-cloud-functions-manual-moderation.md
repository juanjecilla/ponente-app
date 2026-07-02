# ADR 0005: No Cloud Functions — Manual Moderation, No Client Counters

**Status:** Accepted (2026-06)

## Context
Several features imply server-side logic: incrementing `reportCount` when a report is filed, verifying GDE status (`gdeVerified`), and moderating/disabling profiles. The natural home is Cloud Functions — but **Cloud Functions require the Blaze plan**, which conflicts with the strictly-free constraint. There is no trusted server-side execution environment on Spark.

## Decision
- **No `reportCount` maintained by the client.** A client-writable counter is both insecure (any client could inflate it) and impossible to secure without a server. The field stays in the type as **admin-only/optional**; if a number is ever wanted, an admin sets it manually in the console. Moderation decisions are driven by reading the `reports` collection directly.
- **All admin/moderation actions are manual via the Firebase console**: disabling a profile (`disabled: true`), setting `gdeVerified`, approving/rejecting `tag_requests`, adding new `tags`.
- Security rules **lock** `disabled`, `gdeVerified`, `reportCount` against all client writes (see `ARCHITECTURE.md`).

## Consequences
- ✅ Stays free; no trusted-compute attack surface.
- ✅ Security rules become simpler and stricter (admin fields are immutable from the client).
- ⚠️ Moderation is manual and doesn't scale — acceptable at MVP (~tens of speakers).
- ⚠️ No automated abuse throttling beyond App Check + auth-gated reports.
- 🔜 Roadmap: Cloud Functions (on Blaze) + an admin panel automate counters, `gdeVerified`, and moderation.

## Alternatives considered
- **Client-maintained `reportCount`** — insecure, rejected.
- **Upgrade to Blaze for one function** — violates the free constraint; deferred to roadmap.
