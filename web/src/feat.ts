/** feat feature wiring — the shared-features pattern from plst@web (core/features.ts),
 * simplified: stat has no backend `/api/features` endpoint, so every row is a baked-in
 * bootstrap row resolved from the build-time FEAT_URL (parcel inlines process.env).
 * Loading itself lives in FeatureSlot.tsx; the gate config in feat-gate.ts. */
export interface FeatureConfig {
  /** The app's named mount point — what `<FeatureSlot slot="…">` matches. */
  slot: string;
  /** feat feature name (directory under feat's features/). */
  id: string;
  /** The custom element the bundle defines — optional: script-only features
   * (bus, http-gate, global-loading) load their bundle and render nothing. */
  element?: string;
  /** feat host the bundle is loaded from. */
  baseUrl: string;
  /** Pinned feature version directory (e.g. "v3"). */
  version: string;
  /** Bundle namespace segment ("js-web"). */
  namespace: string;
}

/** Slots:
 * - `app-init` — wake-up v4 in MANUAL mode: resident but dormant, serves bus `wake-up`
 *   requests only; http-gate sends them when gated traffic fails while the Render back
 *   sleeps. v4 picks the wake way by URL (stat-3lmc.onrender.com → render strategy) and
 *   retries the noy call while noy itself is a cold TW-VH app.
 * - `app-infra` — script-only: the bus (request/reply transport), global-loading
 *   (blocking backdrop while a recovery runs), http-gate (config in feat-gate.ts).
 * - `app-version` — the feat `<deploy-info>` badge (version-display v4). */
export function bootstrapFeatures(featUrl: string): FeatureConfig[] {
  featUrl = featUrl.replace(/\/+$/, '');
  if (!featUrl) return [];
  const row = (slot: string, id: string, version: string, element?: string): FeatureConfig => ({
    slot,
    id,
    ...(element ? { element } : {}),
    baseUrl: featUrl,
    version,
    namespace: 'js-web',
  });
  return [
    row('app-init', 'wake-up', 'v4', 'wake-server'),
    row('app-infra', 'bus', 'v1'),
    row('app-infra', 'global-loading', 'v1'),
    row('app-infra', 'http-gate', 'v2'),
    row('app-version', 'version-display', 'v4', 'deploy-info'),
  ];
}

export const BOOTSTRAP_FEATURES = bootstrapFeatures(process.env.FEAT_URL || '');

/** The feat host (feat.twc1.net) is a cold Passenger app on Timeweb VH: after idle the
 * first request burst fails fast at connection level (~50ms, status 0) — script tags
 * die, the gate never loads, the whole feature chain is dead. This shared promise warms
 * the host BEFORE any feature script is injected: poll /manifest.json (the cheap
 * endpoint version-display already fetches cross-origin) every 1s until it answers ok,
 * bounded at 60s. Always RESOLVES (a warm failure just means the scripts get their
 * chance anyway) — one warm attempt per page, shared by all slots and the gate. */
export function featHostReady(): Promise<void> {
  const base = (process.env.FEAT_URL || '').replace(/\/+$/, '');
  if (!base) return Promise.resolve();
  if (!(featHostReady as any).__promise) {
    (featHostReady as any).__promise = new Promise<void>((resolve) => {
      const startedAt = Date.now();
      const ping = () =>
        fetch(`${base}/manifest.json`, { cache: 'no-store' }).then(
          (r) => {
            if (r.ok || Date.now() - startedAt > 60000) resolve();
            else setTimeout(ping, 1000);
          },
          () => {
            if (Date.now() - startedAt > 60000) resolve();
            else setTimeout(ping, 1000);
          },
        );
      ping();
    });
  }
  return (featHostReady as any).__promise;
}
