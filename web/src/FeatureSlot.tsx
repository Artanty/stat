import React, { createElement, useEffect, useState } from 'react';
import { BOOTSTRAP_FEATURES, featHostReady, type FeatureConfig } from './feat';

/** A named mount point for a remote feat web-component (plst@web's FeatureSlot,
 * bootstrap-rows only — stat has no runtime features config to fetch). Loads the
 * bundle and renders the element; `attrs` are build-time values, never a runtime
 * fetch. Failure behavior is deliberate: if the script fails or the element is
 * unknown the slot renders nothing — a feature must never break the hosting page. */

// One script per URL no matter how many slots render or re-render.
const loadedScripts = new Map<string, Promise<void>>();

function loadScript(url: string): Promise<void> {
  let promise = loadedScripts.get(url);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => {
        loadedScripts.delete(url); // allow a retry after e.g. a network blip
        reject(new Error(`feature script failed to load: ${url}`));
      };
      document.head.appendChild(script);
    });
    loadedScripts.set(url, promise);
  }
  return promise;
}

export function FeatureSlot({
  slot,
  attrs,
}: {
  slot: string;
  attrs?: Record<string, string>;
}) {
  const rows = BOOTSTRAP_FEATURES.filter((f) => f.slot === slot);
  return (
    <>
      {rows.map((feature) => (
        <SlotRow key={`${feature.id}/${feature.version}`} feature={feature} attrs={attrs} />
      ))}
    </>
  );
}

function SlotRow({
  feature,
  attrs,
}: {
  feature: FeatureConfig;
  attrs?: Record<string, string>;
}) {
  const [ready, setReady] = useState(false);

  const scriptUrl = `${feature.baseUrl}/${feature.id}/${feature.version}/${feature.namespace}/`;

  useEffect(() => {
    let alive = true;
    // the feat host may itself be a cold Passenger app (feat.twc1.net): warm it before
    // injecting scripts, or the whole burst fails fast at connection level
    featHostReady().then(() => loadScript(scriptUrl)).then(
      () => alive && setReady(true),
      () => {
        /* stay silent: the slot renders nothing */
      },
    );
    return () => {
      alive = false;
    };
  }, [scriptUrl]);

  // Script-only feature (no element): the bundle's side effects ARE the feature.
  if (!feature.element) return null;
  return ready ? createElement(feature.element, { ...feature.attrs, ...attrs }) : null;
}
