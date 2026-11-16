/** Build-time config for the feat http-gate (feature `http-gate/v2/js-web`), set as a
 * global BEFORE the gate's bundle loads (FeatureSlot mounts it in the app-infra slot).
 * The gate never fetches config at runtime — feature contract. Ported from plst@web's
 * core/feat-gate.ts.
 *
 * The recovery provider is feat `wake-up` v3 in `manual` mode (app-init slot): a gated
 * request that fails while the Render back sleeps parks/holds traffic, the gate requests
 * `wake-up` over the bus, v3 detects the render way from the target URL, the container
 * wakes, parked requests retry once. global-loading (app-infra) shows its blocking
 * backdrop meanwhile — the gate signals it, not us.
 *
 * Dev (local back): no failures ever match, the gate is a no-op passthrough. */

declare global {
  interface Window {
    FEAT_GATE_CONFIG?: unknown;
    featGate?: { request: (url: string, init?: RequestInit) => Promise<Response> };
  }
}

/** Absolute URL of the app's own backend — the thing a failure means is asleep. */
export function gateWakeTarget(): string {
  return (process.env.BACKEND_URL || '').replace(/\/+$/, '') || window.location.origin;
}

/** noy@back proxy for the wake (NOY_URL env, set on deploy to the noy Timeweb VH
 * address). Empty in dev → the wake stays in direct mode: the browser-side render
 * poll can't wake Render cross-origin in prod, noy does it server-side
 * (GET {proxy}/make-wake-request?target=…&app=stat). */
export function noyProxy(): string {
  return (process.env.NOY_URL || '').replace(/\/+$/, '');
}

/** wake-up opts for the gate recovery payload and the <wake-server> attrs —
 * noy mode only when NOY_URL is baked in, direct otherwise. */
export function wakeOpts(): { mode: string; proxy?: string } {
  const proxy = noyProxy();
  return proxy ? { mode: 'noy', proxy } : { mode: 'direct' };
}

export function installFeatGateConfig(): void {
  window.FEAT_GATE_CONFIG = {
    // ERROR 503 = the sleeping-provider answer where readable; NETWORK = preflighted
    // calls (content-type json) dying as network errors when the sleeping edge does
    // not answer CORS preflights — http-gate v2 understands both (plst HAR finding).
    rules: [
      { on: 'ERROR', trigger: 503 },
      { on: 'NETWORK' },
    ],
    recovery: {
      event: 'wake-up',
      payload: { target: gateWakeTarget(), project: 'stat', ...wakeOpts() },
    },
    // bus default is 5s; noy (itself a sleeping Render service) + a Render cold start
    // can run minutes — keep above wake-up's budget
    timeoutMs: 200000,
  };
}

let gateReady: Promise<void> | null = null;

async function warmThenPoll(resolve: () => void): Promise<void> {
  const { featHostReady } = await import('./feat');
  await featHostReady();
  const started = Date.now();
  (function poll() {
    if (window.featGate || Date.now() - started > 3000) return resolve();
    setTimeout(poll, 50);
  })();
}

/** gatedFetch waits on this before its FIRST request: the app's boot fetches race the
 * app-infra script loads, and a failure that slips past before http-gate exists surfaces
 * as a dead user-visible error. First awaits the feat-host warm (a cold feat.twc1.net
 * means no gate for minutes — the wait is the whole point), then a 3s gate poll;
 * without FEAT_URL (dev/tests without the feat host) there is no gate and this
 * resolves at once. */
export function waitForFeatGate(): Promise<void> {
  if (window.featGate || !process.env.FEAT_URL) return Promise.resolve();
  if (!gateReady) {
    gateReady = new Promise((resolve) => {
      warmThenPoll(resolve);
    });
  }
  return gateReady;
}

/** The fetch wrapper for every stat API call. Two transports:
 * - THRU_URL baked in → route through that backend's feat `thru` endpoint
 *   (GET {THRU_URL}/thru?target=…&method=&body= — it mirrors the upstream response).
 *   For networks that cannot reach the back directly (e.g. the local Render block).
 *   The thru host is warmed first — it may be a cold TW-VH Passenger (fast-fail ~50ms).
 * - otherwise → through the http-gate when it loaded (park + wake + retry on failure),
 *   plain fetch otherwise. */
export function thruUrl(): string {
  return (process.env.THRU_URL || '').replace(/\/+$/, '');
}

let thruReady: Promise<void> | null = null;

function thruHostReady(): Promise<void> {
  const base = thruUrl();
  if (!thruReady) {
    thruReady = new Promise((resolve) => {
      const started = Date.now();
      const ping = () =>
        fetch(`${base}/healthz`, { cache: 'no-store' }).then(
          (r) => {
            if (r.ok || Date.now() - started > 60000) resolve();
            else setTimeout(ping, 1000);
          },
          () => {
            if (Date.now() - started > 60000) resolve();
            else setTimeout(ping, 1000);
          },
        );
      ping();
    });
  }
  return thruReady;
}

export async function gatedFetch(url: string, init?: RequestInit): Promise<Response> {
  const thru = thruUrl();
  if (thru) {
    await thruHostReady();
    const method = (init?.method || 'GET').toLowerCase();
    const body = typeof init?.body === 'string' ? init.body : null;
    const qs =
      'target=' + encodeURIComponent(url) +
      (method !== 'get' ? '&method=' + method : '') +
      (body ? '&body=' + encodeURIComponent(body) : '');
    return fetch(`${thru}/thru?${qs}`);
  }
  await waitForFeatGate();
  return (window.featGate?.request ?? fetch)(url, init);
}
