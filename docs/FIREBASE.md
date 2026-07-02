# Firebase Guide: Ponente

Everything Firebase, on the **Spark (free)** plan. Read alongside `ARCHITECTURE.md`.

## Services Map (web support + plan)

| Service | Used for | Web? | Free on Spark? |
|---------|----------|------|----------------|
| Auth | Google OAuth | ✅ | ✅ |
| Firestore | All data | ✅ | ✅ (50k reads / 20k writes / 1 GiB / day-quota) |
| Hosting | SPA + preview channels | ✅ | ✅ |
| Remote Config | Feature flags + A/B param | ✅ | ✅ |
| App Check | reCAPTCHA v3 abuse protection | ✅ | ✅ |
| Analytics (GA4) | Custom events + `exception` | ✅ | ✅ |
| Performance Monitoring | Auto + custom traces | ✅ | ✅ |
| A/B Testing | `directory_layout_test` | ✅ | ✅ (needs GA linked) |
| **Storage** | Photos | ✅ | ❌ **Blaze required since 2026-02-03** → use Supabase (ADR 0004) |
| **In-App Messaging** | — | ❌ **No web SDK** → custom banner (ADR 0006) | — |
| **Cloud Functions** | — | ✅ | ❌ Blaze required → manual console moderation (ADR 0005) |

## Firestore Security Rules
Full rules in `ARCHITECTURE.md`. Rationale:
- Public reads limited to `published==true && disabled==false`.
- Owner can read/write only their own `speakers/{uid}`.
- **Publish gate** enforced server-side (`publishReady()`), not just UI.
- **Admin-only fields** (`disabled`, `gdeVerified`, `reportCount`) locked: create forces safe defaults, update requires they stay unchanged.
- `tags` public read, no client write (seeded via console/Admin SDK).
- `tag_requests` + `reports`: authenticated create with `requestedBy/reportedBy == auth.uid`; no client read (admin via console).

Deploy: `firebase deploy --only firestore:rules,firestore:indexes`.

## Composite Index
Directory query filters two equality fields → composite index required. See `firestore.indexes.json` in `ARCHITECTURE.md`. Firestore will also print a console URL to auto-create it if missing.

## Remote Config — Feature Flags

All boolean flags default `true` (kill-switch any feature without redeploy).

| Parameter | Type | Default | Effect |
|-----------|------|---------|--------|
| `enable_speaker_registration` | bool | true | Gates profile form + publish |
| `enable_photo_upload` | bool | true | Hides upload section |
| `enable_city_autocomplete` | bool | true | Falls back to static city list / plain text |
| `enable_tag_requests` | bool | true | Hides "request missing tag" |
| `enable_gde_status` | bool | true | Hides GDE fields |
| `enable_report_abuse` | bool | true | Hides report button |
| `enable_es_locale` | bool | true | Hides language switcher |
| `enable_public_directory` | bool | true | Gates `/` listing |
| `photo_storage_backend` | string | `"supabase"` | `"supabase"` \| `"firebase"` — selects StorageProvider |
| `directory_layout` | string | `"grid"` | `"grid"` \| `"list"` — A/B test param |

Fetch policy: `minimumFetchIntervalMillis` short in dev (e.g. 0–60s), default (12h) in prod. Always ship in-SDK defaults matching this table so the app works before first fetch.

## App Check
- reCAPTCHA v3 (invisible). Init **before** Firestore in `lib/firebase.ts`.
- Dev + CI: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN` (register the debug token in console). Without it, enforcement rejects local/CI requests.
- Enable enforcement on Firestore **only after** debug tokens are wired. Supabase has its own RLS (independent of App Check).

## Analytics — Custom Events

| Event | Fired when |
|-------|-----------|
| `speaker_registered` | First publish |
| `profile_updated` | Speaker saves changes |
| `speaker_searched` | Any filter applied |
| `speaker_profile_viewed` | Public profile mounts |
| `tag_requested` | Missing tag submitted |
| `speaker_reported` | Report submitted |
| `locale_changed` | Language switched (`{locale}`) |
| `exception` | Any caught error (via ErrorTracker) |

## Performance Monitoring
Auto-instruments fetch/XHR (Photon, Firestore REST). Custom traces: `speakers_fetch`, `photo_upload`, `auth_signin`.

## A/B Testing
Experiment `directory_layout_test`: Remote Config `directory_layout` (`grid` control / `list` treatment), goal metric `speaker_profile_viewed`. Requires Google Analytics linked to the Firebase project.

## Why no In-App Messaging
Firebase In-App Messaging has **no Web SDK** (Apple/Android only). The "complete your profile" prompt is implemented as a custom `<ProfileCompletionBanner>` shown when `published==false`. See ADR 0006.

## Auth / OAuth setup
- Enable Google provider in console.
- Configure OAuth consent screen.
- Add **authorized domains**: `localhost`, your `*.web.app`/`*.firebaseapp.com`, the custom domain, and Firebase Hosting **preview-channel** domains (`<project>--<channel>-<hash>.web.app`) so OAuth works on PR previews.
