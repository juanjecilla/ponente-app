# Project Context: Ponente

> Reconciled to the richer design (2026-06). Source of truth: `docs/ARCHITECTURE.md`.

## The Problem

GDGs (Google Developer Groups) and small tech communities can't afford travel and accommodation for speakers. Speakers willing to travel to certain cities cheaply — family there, already visiting, based nearby — are invisible to those organizers. Aspiring GDEs (Google Developer Experts) need speaking opportunities to build a portfolio but have no structured way to surface availability.

## The Solution

A public directory where speakers self-register and declare:
- Which topics they speak on
- Which cities they can travel to, and at what cost

Organizers browse publicly (no account) and contact speakers directly via the speaker's own links.

## Audience

**Primary: Speakers** — GDG members, aspiring GDEs, any tech speaker.
**Secondary: Organizers** — GDG chapter leads (often speakers, already have accounts) and any organizer looking for affordable speakers.

## Key Product Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary user | Speaker-first | Supply constraint — build speaker supply, organizers follow |
| Core model | Directory | Lowest-friction MVP; no messaging system |
| Travel model | City + cost tier | Core differentiator; organizers need budget info |
| Contact | Typed external links only | Speaker controls; no in-app messaging |
| Auth | Google OAuth only | GDG community is Google-native |
| Organizer accounts | Not required | Public browse; sign-in only to report |
| Profile visibility | Publish toggle (rule-enforced gate) | Avoid empty profiles cluttering directory |
| City input | **Photon** (free, autocomplete-allowed) | `CHANGED:` Nominatim prohibits autocomplete (ADR 0003) |
| Topics | **Dynamic `tags` collection** | `CHANGED:` admins add tags without redeploy |
| Photos | **Supabase default / Firebase optional** behind flag | `CHANGED:` Firebase Storage needs Blaze (ADR 0004) |
| Reports | **Authenticated** | `CHANGED:` accountability + spam control |
| Moderation | Manual via console | No Cloud Functions on Spark (ADR 0005) |
| App language | i18n from day 1 | English first, Spanish immediately after |

## Cost Tiers

| Value | Meaning |
|-------|---------|
| `free` | Speaker covers 100% — travel, accommodation, everything |
| `self-covered` | Speaker covers travel, may need a small contribution |
| `needs-expenses` | Speaker needs travel + accommodation covered |

## Topic Taxonomy (seed)

Stored in the `tags` Firestore collection, each with `label:{en,es}`. Seed slugs: `android, web, cloud, ai-ml, flutter, firebase, devops, security, data, open-source, community, other`. Speakers request missing topics → `tag_requests` → admin reviews via console.

## Trust & Safety

- **Optional talk link** — link to a past talk (YouTube, Sessionize) or skip with "Not yet". Many new speakers haven't been recorded.
- **Authenticated report system** — signed-in users report a profile (`reportedBy = uid`); written to `reports`; admin disables via console (`disabled: true`).
- **No admin panel for MVP** — all moderation via Firebase console. `gdeVerified` set manually.
- **App Check** (reCAPTCHA v3) guards Firestore against bots.

## Free-Tier Reality (must-read for implementers)

- **No Cloud Functions** (Spark): no server-side counters, no automated moderation. `reportCount` is admin-maintained, not client-written.
- **Firebase Storage needs Blaze** (since 2026-02-03): default photo backend is Supabase; Firebase Storage code exists behind a flag for when/if the project upgrades.
- **Photon fair-use**: debounce + cache; bundled city fallback.
- **Firestore Spark caps**: 50k reads / 20k writes per day. Directory fetch-all is fine at MVP scale.

## Roadmap (Not MVP)

- GitHub OAuth — pull developer stats into profile
- Organization accounts — GDG chapters post needs; bi-directional matching
- Admin panel UI + Cloud Functions — automate moderation, counters, `gdeVerified`
- GDE portfolio tracking — verified talk history
- Self-hosted Photon — richer city coverage, no fair-use limits
- Full-text search + pagination — when the directory grows
