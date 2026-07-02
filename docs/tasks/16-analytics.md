# Task 16: Analytics (Custom Events)

**Phase:** 10
**Estimated Effort:** 1.5 hours
**Dependencies:** 01; feeds 13 (AnalyticsProvider) and 18 (A/B goal metric)

---

## Context

Firebase Analytics (GA4) records 8 custom events for product insight and powers the A/B test goal metric. The Analytics instance is also consumed by the `AnalyticsProvider` (task 13) for `exception` logging.

## Goal

Analytics initialized and all 8 events wired with typed helpers.

---

## Implementation Steps

### 16.1 Init — `src/lib/analytics.ts`
```typescript
import { getAnalytics, isSupported, logEvent, setUserId } from 'firebase/analytics';
import { app } from './firebase';

export const analytics = (await isSupported()) ? getAnalytics(app) : null;
type Params = Record<string, string | number | boolean>;
export const track = (event: string, params?: Params) => { if (analytics) logEvent(analytics, event, params); };
export { setUserId };
```
(Or lazy-init to avoid top-level await; provide a `getAnalytics` accessor.)

### 16.2 Events
| Event | Where | Params |
|-------|-------|--------|
| `speaker_registered` | first publish (task 04) | — |
| `profile_updated` | subsequent save (task 04) | — |
| `speaker_searched` | filter change, debounced (task 08) | `{filterType}` |
| `speaker_profile_viewed` | SpeakerPage mount (task 08) | `{uid}` |
| `tag_requested` | tag request submit (task 06) | — |
| `speaker_reported` | report submit (task 09) | `{reason}` |
| `locale_changed` | switcher (task 10) | `{locale}` |
| `exception` | via AnalyticsProvider (task 13) | `{description, fatal}` |

---

## Corner Cases & Gotchas
- **`isSupported()`:** Analytics throws in unsupported/SSR/test envs — guard init and `track` no-ops when null.
- **DebugView:** use `?firebase_analytics_debug=1` / DebugView to verify events in real time; data in standard reports lags ~24h.
- **PII:** don't log names/emails as params; `uid` is acceptable (pseudonymous, ADR 0002 stance).
- **Event volume / search spam:** debounce `speaker_searched` (matches task 08).
- **A/B dependency:** `speaker_profile_viewed` is the experiment goal metric (task 18) — must fire reliably on every profile view.
- **Consent:** EU/GDPR — Analytics is pseudonymous here; if a cookie/consent banner is added later, gate Analytics behind consent. Document as a known follow-up.

## Definition of Done
- [ ] Analytics initialized behind `isSupported()`; `track()` no-ops when unavailable.
- [ ] All 8 events fire at the right moments with documented params.
- [ ] `speaker_searched` debounced; `speaker_profile_viewed` reliable.
- [ ] Events verified in DebugView.
- [ ] Analytics instance exported for AnalyticsProvider (task 13).
