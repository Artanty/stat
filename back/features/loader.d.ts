// VENDORED from feat/back/features/loader/v1/js-node/loader.d.ts (spec: feat/back/spec/backend-slots.md) — re-vendor on feature updates.
/** Contract: back/spec/backend-slots.md (js-node namespace, v1). */
export interface MountOptions {
  /** override process.env (tests) */
  env?: Record<string, string | undefined>;
  /** override the feature-dir root (tests); default = dir of the loader file */
  vendoredDir?: string;
}

/** Mount vendored backend features per FEAT_<ID>_MOUNT env rows. Returns mounted ids. */
export function mountBackendFeatures(app: any, opts?: MountOptions): Promise<string[]>;
