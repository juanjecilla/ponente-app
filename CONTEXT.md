# Ponente — Domain Glossary

> Reconciled to the richer design (2026-06). See `docs/ARCHITECTURE.md` for the source of truth and `docs/adr/` for decisions.

## Core Domain

**Speaker** — A tech professional who registers on Ponente to surface their availability to give talks. The primary user. Owns their profile and controls its visibility.

**Organizer** — A community lead or GDG chapter organizer looking for speakers. Often also a Speaker. Browses the directory without an account; contacts speakers via their external links. **Must sign in only to report a profile.**

**Profile** — A Speaker's public representation in the directory. Contains topics, city availabilities, typed contact links, and optional fields. Controlled entirely by the Speaker.

**Published** — A Profile state the Speaker explicitly activates. Not visible in the directory until Published. The publish gate (at least one Topic, one City Availability, one Contact Link, plus a name) is **enforced in Firestore security rules**, not just the UI.

**City Availability** — A city a Speaker can travel to, paired with a Cost Tier. A Speaker may have multiple. Stored as `{name, key, lat, lng, tier}`; cities are resolved via the **Photon** geocoder.

**City Tier Token** — A derived string `"{cityKey}:{tier}"` (e.g. `"madrid:free"`) stored in `cityTierTokens[]`, used for fast client-side faceted filtering.

**Cost Tier** — Expense coverage a Speaker requires for a given city: `free` (Speaker covers everything), `self-covered` (Speaker covers travel, may need small help), `needs-expenses` (Speaker needs travel + accommodation covered).

**Topic** — A technology area a Speaker speaks on. Drawn from the dynamic **`tags`** Firestore collection (each tag carries `label:{en,es}`). `CHANGED:` no longer a hardcoded constant — admins add tags via console without a redeploy.

**Tag Request** — A Speaker's request to add a Topic not yet in the taxonomy. Stored in `tag_requests` for admin review via console; not immediately public.

**Contact Link** — A **typed** `{type, value}` pair (Email | LinkedIn | Twitter/X | GitHub | Website | Sessionize). Value validated per type. The only channel for an Organizer to reach a Speaker. No in-app messaging.

**Report** — An **authenticated** complaint about a Speaker's Profile (`reportedBy = uid` required). Written to `reports`. Reviewed by admin via Firebase console; may result in the Profile being Disabled.

**Disabled** — An admin-set Profile state that removes it from the directory. Distinct from Unpublished (Speaker-controlled). Admin-only field — clients cannot write it.

**GDE Verified** — An admin-only boolean confirming a Speaker's GDE status. Set manually via console; clients cannot write it. Distinct from self-reported **GDE Status**.

## Community

**GDG** (Google Developer Group) — A community tech group, typically city-level, organizing free events. A key audience; GDGs usually cannot cover speaker travel costs.

**GDE** (Google Developer Expert) — A Google-recognized community expert. Aspiring GDEs need documented speaking engagements; Ponente surfaces opportunities.

**GDE Status** — A self-declared field: `none`, `aspiring`, or `current`. Not verified by Ponente (shown as "unverified" unless `gdeVerified`).

## Infrastructure

**Photon** — An OpenStreetMap-based geocoder (komoot, free, no key) that **supports search-as-you-type**. Replaces Nominatim, whose policy prohibits autocomplete. See ADR 0003.

**Storage Provider** — An abstraction over photo storage. `SupabaseStorageProvider` (default, free) or `FirebaseStorageProvider`, chosen by the Remote Config flag `photo_storage_backend`. See ADR 0004.

**Remote Config** — Firebase feature-flag service. Each major feature is gated by a flag so it can be killed without a redeploy; also drives the directory A/B test.

**Manual Moderation** — Because the free Spark plan has no Cloud Functions, all admin actions (disable, set `gdeVerified`, approve tags) are done by hand in the Firebase console. See ADR 0005.

## Observability

**Error Boundary** — A React component that catches render errors and reports them via `ErrorTracker` (→ Sentry). Wraps the entire app.

**ErrorTracker** — An abstraction fanning errors to multiple providers (Sentry + Firebase Analytics `exception` event). Nothing imports Sentry directly. See ADR 0002.

**Session Replay** — A Sentry recording captured only on error (`replaysOnErrorSampleRate: 1.0`). All form inputs masked.

**Profile Completion Banner** — A custom in-app banner prompting unpublished Speakers to finish their profile. Replaces Firebase In-App Messaging, which is **not supported on Web**. See ADR 0006.

## Security

**App Check** — Firebase abuse protection (reCAPTCHA v3) that verifies requests originate from the real app. Enforced on Firestore.

**Supply-chain Attack** — A compromise via a malicious or hijacked npm dependency, distinct from known CVEs. Detected by Socket.dev, not Dependabot.

**SAST** (Static Application Security Testing) — Automated source analysis for vulnerabilities. In Ponente: GitHub CodeQL + ESLint security plugins.
