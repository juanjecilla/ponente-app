# Task 14: Remote Config (Feature Flags)

**Phase:** 10
**Estimated Effort:** 2 hours
**Dependencies:** 01

---

## Context

Remote Config provides kill-switches for every major feature (toggle without redeploy) and the A/B test parameter. Other tasks depend on these flags, so build this early in Phase 10 (or stub `getFlag` returning defaults so features compile before the console is set up).

## Goal

`lib/remote-config.ts` with typed accessors, in-SDK defaults matching `docs/FIREBASE.md`, and all 10 parameters defined in the console.

---

## Implementation Steps

### 14.1 Init — `src/lib/remote-config.ts`
```typescript
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { app } from './firebase';

const rc = getRemoteConfig(app);
rc.settings.minimumFetchIntervalMillis = import.meta.env.PROD ? 12 * 3600_000 : 60_000;
rc.defaultConfig = {
  enable_speaker_registration: true,
  enable_photo_upload: true,
  enable_city_autocomplete: true,
  enable_tag_requests: true,
  enable_gde_status: true,
  enable_report_abuse: true,
  enable_es_locale: true,
  enable_public_directory: true,
  photo_storage_backend: 'supabase',
  directory_layout: 'grid',
};

export const initRemoteConfig = () => fetchAndActivate(rc).catch(() => {/* defaults apply */});
export const getFlag = (k: keyof typeof rc.defaultConfig) => {
  const v = getValue(rc, k);
  // booleans vs strings
  return k.startsWith('enable_') ? v.asBoolean() : v.asString();
};
```

### 14.2 Hook — `src/hooks/useRemoteConfig.ts`
- Call `initRemoteConfig()` on app start; expose typed flag getters; re-render when activated.

### 14.3 Console
- Define all 10 parameters with the defaults above (booleans `true`, `photo_storage_backend="supabase"`, `directory_layout="grid"`).

### 14.4 Gate features
- `enable_speaker_registration` → profile form + publish (task 04)
- `enable_photo_upload` → photo section (task 07)
- `enable_city_autocomplete` → Photon vs static/text (task 05)
- `enable_tag_requests` → request input (task 06)
- `enable_gde_status` → GDE fields (task 04)
- `enable_report_abuse` → report button (task 09)
- `enable_es_locale` → language switcher (task 10)
- `enable_public_directory` → `/` listing (task 08)
- `photo_storage_backend` → StorageProvider (task 07)
- `directory_layout` → grid/list (task 18)

---

## Corner Cases & Gotchas
- **First-load race:** before `fetchAndActivate` resolves, `getValue` returns **in-SDK defaults** — so defaults MUST match intended behavior. Never leave a flag undefined.
- **Stale flags in prod:** 12h fetch interval means kill-switches take up to 12h unless you lower the interval or force-fetch on critical paths. For true "instant kill", lower interval (accept more reads) or call `fetchAndActivate` on load + visibility change. Document the trade-off.
- **Type discipline:** `enable_*` are booleans, the two layout/backend flags are strings; the accessor split prevents `asBoolean()` on a string flag.
- **Flag-off = remove, not disable:** gated sections should unmount, not just gray out (consistency + a11y).
- **Testing:** unit-test gating by mocking `getFlag`; don't hit Remote Config in tests.
- **App Check dependency:** Remote Config fetch is also subject to App Check if enforced — ensure debug token in dev/CI.

## Definition of Done
- [ ] `lib/remote-config.ts` with init + typed `getFlag` + complete in-SDK defaults.
- [ ] All 10 params defined in console.
- [ ] Every listed feature reads its flag and unmounts when off.
- [ ] Toggling `enable_speaker_registration`/`directory_layout` in console changes behavior without redeploy (within fetch interval).
- [ ] Gating unit-tested with mocked flags.
