# Ponente — AI Agent Documentation

Comprehensive context for AI agents implementing Ponente. **Read in this order**, then execute tasks in dependency order.

## Read first
1. `PROJECT_CONTEXT.md` — product, audience, decisions, **free-tier reality**.
2. `ARCHITECTURE.md` — **source of truth**: stack, structure, schema, rules, abstractions.
3. `../CONTEXT.md` — domain glossary (ubiquitous language).
4. `FIREBASE.md` — Firebase services map, rules rationale, flags, App Check, A/B, why no In-App Messaging.
5. `TESTING.md` — test strategy, coverage thresholds, a11y, Lighthouse.
6. `adr/` — the *why* behind the load-bearing decisions (0001–0006).
7. `DEPLOYMENT.md` — CI deploy flow, required secrets/vars, preview channels, Firestore rules/indexes, cache headers.

## Project Overview

**Name:** Ponente · **Domain:** ponente.app · **Type:** React SPA
**Purpose:** Public speaker directory where tech speakers register travel availability by city + cost tier, enabling GDG organizers to find affordable speakers.

## Goals (MVP)
1. Speakers register via Google OAuth and create a profile.
2. Available cities + cost tier (free / self-covered / needs-expenses).
3. Organizers browse + filter publicly (no account; sign-in only to report).
4. Dynamic topic taxonomy (`tags` collection) with tag-request flow.
5. Authenticated report system for spam/fake profiles.
6. English + Spanish (react-i18next from day 1).
7. Firebase showcase suite: Remote Config flags, App Check, Analytics, Performance, A/B Testing.

## Tasks (dependency order)

| # | Task | Phase | Depends on |
|---|------|-------|-----------|
| 00 | OSS setup + quality gates | 0 | — |
| 01 | Project setup | 1 | 00 |
| 02 | Auth | 2 | 01 |
| 03 | Firestore schema + rules + indexes | 3 | 01 |
| 04 | Profile form | 3 | 02, 03, 05, 06, 07 |
| 05 | City search (Photon) | 3 | 01 |
| 06 | Topics (dynamic tags) | 3 | 03 |
| 07 | Photo upload (storage abstraction) | 3 | 03, 14 |
| 08 | Public directory | 4 | 03, 06 |
| 09 | Report system | 5 | 02, 03 |
| 10 | i18n (EN/ES) | 6 | 01, 06 |
| 11 | Deployment | 6 | 00, 01 |
| 12 | Security scanning | 7 | 00 |
| 13 | Observability (Sentry + ErrorTracker) | 8 | 01 |
| 14 | Remote Config (feature flags) | 10 | 01 |
| 15 | Performance Monitoring | 10 | 01 |
| 16 | Analytics (events) | 10 | 01, 13 |
| 17 | App Check (reCAPTCHA v3) | 10 | 01, 03 |
| 18 | A/B Testing (directory layout) | 10 | 08, 14, 16 |
| 19 | In-app banner (replaces In-App Messaging) | 10 | 04 |

## Each task file contains
Phase · Estimated Effort · Dependencies · Context · Goal · Implementation Steps (with code) · **Corner Cases & Gotchas** · Definition of Done.

## Key Constraints
- **Free tier only** — Photon for cities, Supabase for photos (Firebase Storage needs Blaze), Firebase Spark for the rest.
- **No SSR** — pure SPA on Firebase Hosting.
- **No Cloud Functions** — all admin/moderation is manual via Firebase console.
- **Google-first** — Firebase everywhere, Google OAuth.
- **i18n from day 1** — wrap all UI strings in `t()`; speaker content stays as entered.
