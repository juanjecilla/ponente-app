import { useEffect, useState } from 'react';
import {
  initRemoteConfig,
  getFlags,
  FLAG_DEFAULTS,
  type FeatureFlags,
} from '../lib/remote-config';

export interface UseRemoteConfigResult {
  /** Currently-active, typed feature flags. Starts at in-SDK defaults. */
  flags: FeatureFlags;
  /** `true` until the initial fetch/activate attempt settles. */
  loading: boolean;
  /** `true` once a fresh remote config was activated (else defaults apply). */
  activated: boolean;
}

/**
 * Reads Firebase Remote Config on mount and exposes typed feature flags plus a
 * loading state. Before the fetch settles (and whenever Remote Config is
 * unavailable) the in-SDK {@link FLAG_DEFAULTS} are returned, so consumers can
 * render immediately without guarding against `undefined`.
 */
export const useRemoteConfig = (): UseRemoteConfigResult => {
  const [flags, setFlags] = useState<FeatureFlags>(FLAG_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void initRemoteConfig()
      .then((didActivate) => {
        if (cancelled) return;
        setActivated(didActivate);
        setFlags(getFlags());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading, activated };
};
