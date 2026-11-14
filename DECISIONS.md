# DECISIONS.md

## Note (2026-11-15) - Hosting update: vercel out, Timeweb in
- stat@web is now deployed at **https://stat.twc1.net/** (Timeweb). Vercel is hard to use now — treat all vercel references for stat as historical: the two-brothers slave web on two-brothers-navy.vercel.app is deprecated.
- stat@back remains on Render free tier (stat-3lmc.onrender.com) — still sleeps; wake support moved to the shared feat project (feat wake-up v3, render way, 2026-11-15).

## Task: Add Render logs tab to stat web

### Plan (2026-09-04)
- Add `getRenderLogs` API function to `web/src/api.service.ts` calling Render API `GET https://api.render.com/v1/logs` with Bearer token + query params (ownerId, resource, startTime, endTime, direction, type, limit).
- Create `web/src/components/LogsTab.tsx`: form (apiKey/token, ownerId, resource, startTime, endTime, direction, type, limit) persisted to localStorage; "Get log" button; render `logs[].message` in a `<pre><code>` block.
- Create `web/src/components/LogsPage.tsx`: antd Tabs — "stat" tab = current GridLayout, "logs" tab = LogsTab.
- Wire: `index.js` route `/logs`; App renders LogsPage.

### Progress (2026-09-04)
- Added `getRenderLogs` + types (`GetRenderLogsRequest`, `RenderLogsResponse`, `RenderLogEntry`, `RENDER_LOGS_URL`) to `web/src/api.service.ts` calling `GET https://api.render.com/v1/logs` with Bearer auth + query params.
- Created `web/src/components/LogsTab.tsx`: form (apiKey, ownerId, resource, direction, startTime, endTime, type, limit) persisted to localStorage (`renderLogsForm`), "Get logs" button, `<pre><code>` block rendering `logs[].message`.
- Created `web/src/components/LogsPage.tsx`: antd Tabs — "stat" (StatPanel) and "logs" (LogsTab).
- Extracted current stat UI to `web/src/components/StatPanel.tsx` (old App header+layout).
- Rewrote `web/src/App.tsx` to render `<DataProvider><LogsPage/></DataProvider>`.
- `parcel build` succeeds; new/modified files type-clean (remaining tsc errors are pre-existing in DateSelect/LineChart/GetUpdates/helpers).
- BACKEND: removed proxy config, SAFE_URL -> http://localhost:3231, back /get-projects verified 200.
- WEB: getProjectsApi calls SAFE directly, handles raw-array response.

### Progress (2026-09-05) - Logs list tab + tab colors
- back: reverted getProjectsApi to call back `/get-projects` (proxies to safe :3231); removed SAFE_URL from web code + env.
- Added back endpoint `POST /get-events-list` (back/app.js) filtering events by optional projectId, namespace, stage, isError, dateRange.startDate/endDate, limit; returns `{ data: rows }` mirror of `events` table.
- web: added `getEventsList` to api.service.ts.
- Created `web/src/components/ListTab.tsx`: filters (projectId, namespace, stage, isError selects, DateSelect reused for date range, default today) + `getLogs` button + antd Table (id, projectId, namespace, stage, isError, eventData, eventDate). Filters persisted to localStorage.
- Created `web/src/components/LogsPage.tsx`: 3rd 'list' tab added; fixed inactive tab color (grey #a7a7a7) and active/ink (blue) visible on black bg.
- `parcel build` OK; new files type-clean; endpoint verified 200 with/without filters.

### Progress (2026-09-05) - Back JS -> TS + nodemon
- Converted back to TypeScript: `app.ts`, `core/db_connection.ts`, `core/db_check_connection.ts`, `core/get_version.ts`, `middleware/versionInterceptor.ts`. Removed old `.js` files and empty `test/app.test.js`.
- Added types: express Request/Response, mysql2 Pool/ResultSetHeader, EventRow/request body interfaces, async-retry, axios.
- Added `tsconfig.json` (ESM, strict, noEmit, types: node).
- Added dev deps: typescript@5.9.3, tsx, nodemon@3.1.14, @types/node/express@4/cors/async-retry.
- Scripts: `dev` = nodemon, `start` = tsx app.ts, `build`/`typecheck` = tsc.
- nodemonConfig watches app.ts, core, middleware; exec `tsx app.ts`.
- Verified: `tsc --noEmit` clean; `npm start` (tsx) serves on 3230 with endpoints returning 200; nodemon auto-restarts on file change.

### Progress (2026-09-05) - Light/dark theming + logs tab date range
- Created `web/src/theme.tsx`: ThemeProvider/useTheme + light/dark color tokens (background, surface, text, muted, border, codeBg/codeText, cardHeaderBg/cardBodyBg). Persists to localStorage `themeMode`, defaults to system preference. Sets document.body background.
- `web/src/App.tsx` wraps app in ThemeProvider + antd ConfigProvider (darkAlgorithm/defaultAlgorithm). Removed `DARK_BACK_COLOR`.
- Added `web/src/components/ThemeToggle.tsx` (Switch) in StatPanel header.
- Replaced hardcoded colors across StatPanel, GridLayout, ListTab, LogsTab, LogsPage, VersionDisplay, LineChart with theme tokens.
- Note: theme.ts must be `.tsx` (contains JSX `ThemeContext.Provider`).
- LogsTab: merged Start/End time into a single Date range picker (RangePicker showTime, default today). Tab label renamed 'logs' -> 'render.com logs'.
- `parcel build` OK; theme new files type-clean (LineChart errors pre-existing).

### Progress (2026-09-05) - List tab filter controls
- ListTab filters changed: projectId -> Select populated from getProjectsApi (default 'all'); namespace -> Select (all/web/back/build, default all); stage -> Select with 'all' default; isError -> Switch toggle default false. Removed free-text Inputs.

### Progress (2026-09-05) - Render logs via back proxy (CORS fix)
- Browser -> api.render.com blocked by CORS. Added back route `POST /get-render-logs` (back/app.ts) that forwards GET to `https://api.render.com/v1/logs` with Bearer token; web `getRenderLogs` now POSTs to that proxy (removed direct fetch + RENDER_LOGS_URL usage).
- Restarted back on :3230 (was stale tsx, not nodemon).
- ISSUE: `api.render.com` is NOT reachable from the back server's network (curl + axios both ETIMEDOUT/HTTP 000). Browser reached Render earlier because it runs on a different network. Needs investigation (Render API likely reachable only from inside Render or whitelisted IPs).
- Decision: use browser-side Parcel dev-proxy instead of back proxy. Added `web/.proxyrc.json` (Parcel reads this, NOT package.json `parcel` or `.parcelrc`) mapping `/v1` -> `https://api.render.com` with `changeOrigin:true`. 
- Reverted `getRenderLogs` (api.service.ts) to same-origin GET `/v1/logs?...` with Bearer header; `RENDER_LOGS_URL = '/v1/logs'`.
- Kept back `POST /get-render-logs` route (non-functional without network fix; unused by web now).
- Verified: Parcel dev-server on :1234 proxies `/v1/logs` to api.render.com (outbound TCP attempt observed). Works in browser env where Render is reachable; times out only on machines/networks where Render is blocked.

### Progress (2026-09-05) - Remove render proxy + add error logging
- Removed back `POST /get-render-logs` route and `GetRenderLogsBody` interface (was dead code).
- Added `appendErrorLog()` helper in `app.ts` — appends JSON lines to `back/storage/error.log` (auto-creates dir). Each entry: `timestamp`, `route`, `method`, `error`, `stack`.
- Added global Express error handler middleware that logs unhandled errors to `error.log`.
- Hooked `appendErrorLog` into all route catch blocks: `/get-last-events`, `/add-event`, `/get-events-list`, `/get-projects`, `/get-project-entries`.
- LogsPage tabs now sync with URL via `?tab=` query param (stat/logs/list).
- `tsc --noEmit` clean.

### Progress (2026-09-05) - DB status in get-updates
- `checkDBConnection()` now returns `DBCheckResult` (`{ connected, tableCount?, database?, error? }`) instead of `void`.
- `/get-updates` response includes `db` field with the connection check result.
- `tsc --noEmit` clean.

### Plan (2026-09-07) - Stat V2 Tab
- **Goal**: Add "stat v2" tab showing current state of all projects as widgets with logs from stat db.

### Progress (2026-09-07) - Stat V2 Tab
- Backend: Added `POST /get-projects-status` endpoint (back/app.ts) - queries events table for all projects, returns per-project: totalEvents, errorCount, lastEventDate, recentEvents (last 5).
- Frontend: Added `getProjectsStatus` API function + `ProjectStatusItem` interface (web/src/api.service.ts).
- Frontend: Created `web/src/components/StatV2Tab.tsx` - Card grid layout showing each project's status (error badge, total events, last active, recent events list).
- Added "stat v2" tab to `LogsPage.tsx`.
- `tsc --noEmit` clean for both back and web (new files; pre-existing node_modules errors in web unchanged).

### Progress (2026-09-07) - Stat V2 project toggles
- `StatV2Tab.tsx`: added top row tag-buttons (Checkbox.Group in Buttons) to toggle each project; "all" button toggles all. Selection persisted to localStorage key `statV2Checked`; cards filtered by selection. Project button color reflects status (primary=ok, danger=errors, default=no events). `parcel build` + `tsc --noEmit` clean.

### Plan/Progress (2026-09-07) - Stat V2 filter + sort row
- Add row above project toggles with:
  - Namespace filter: 'web'/'back' button-tags, both enabled by default (persisted `statV2NamespaceFilter`).
  - Sort: Segmented 'recent' (default, lastEventDate desc) / 'abc' (alphabetical asc) persisted `statV2SortMode`.
- Cards filtered by namespace + checked, then sorted by mode.
- Done: implemented above; visibleProjects memo filters by namespaceFilter + checked and sorts recent desc (nulls last) or abc asc. State persisted to localStorage. `parcel build` + `tsc --noEmit` re-verified.

## Plan (2026-11-14) - Deploy visual schema (deploy events + deploy tab)
- **Goal**: visualize the deploy flow (serf master action → slave action) in stat web as one sequence per deploy run, linked by `workflowRunId`.
- **Event model** (replaces serf's old PUSH_MASTER/GET_SAFE/PUSH_SLAVE/UNKNOWN): stages `MASTER_START` / `MASTER_END` / `MASTER_ERROR` / `SLAVE_START` / `SLAVE_END` / `SLAVE_ERROR`; new optional `/add-event` fields: `workflow` ('master'|'slave'), `workflowRunId` (serf master run id; propagated to the slave via `.env` `WORKFLOW_RUN_ID`), `commitMessage`, `steps` (JSON array string of passed milestones/branches). Server-start event skipped for now.
- **Back**: new `core/ensure_deploy_columns.ts` (idempotent startup `ALTER TABLE events ADD COLUMN` for workflowRunId VARCHAR(64), workflow VARCHAR(16), commitMessage VARCHAR(512), steps TEXT); `/add-event` builds INSERT dynamically so only provided new fields are stored; new `POST /get-deploy-runs` (filters projectId/workflowRunId/dateRange/limit, groups events by workflowRunId into run objects with a stages map + parsed steps).
- **Web**: `models.ts` stat_stages += MASTER_START/MASTER_END/SLAVE_START/SLAVE_END (legacy values kept so history charts render); `api.service.ts` getDeployRuns + DeployRun/DeployEvent types; new `DeployTab.tsx` (left: runs list; right: Segmented 'sequence' — per-run MASTER→SLAVE timeline with steps chips, errors red — and 'schema' — static pipeline diagram flow → serf → slave repo → slave action → hosting with the run's taken path lit); projectId filter; view+filter persisted; register 'deploy' tab in LogsPage after 'stat v2'.
- **Also in this effort**: serf `.github/workflows/deploy.yml` (new master/slave events + steps marks + WORKFLOW_RUN_ID in .env — logged in serf/DECISIONS.md) and `../know/entries/deploy-slave.md` telemetry section.

### Plan/Progress (2026-11-14, 3) - Remove render.com logs integration — REVERTED
- **Why**: user asked to delete render.com from the project; minutes later said they were wrong and asked to undo.
- **Removed then reverted**: deleted `web/.proxyrc.json`, `LogsTab.tsx`, the 'render.com logs' tab, and `getRenderLogs`+types; all restored same session — LogsTab.tsx and .proxyrc.json via `git checkout --` (untouched by other work, exact HEAD copies), LogsPage/api.service edits re-applied verbatim. Net change vs before this entry: **none** — render.com integration is fully back.

### Plan (2026-11-14, 2) - Deploy tab project sidebar
- **Why**: the project Select is populated from `/get-projects` (safe proxy) which 500s whenever safe@back isn't running locally — bad UX and log noise.
- **Plan**: replace the Select with a left projects sidebar in DeployTab, derived from the fetched runs themselves (no safe dependency): search input (substring, case-insensitive), sorted by name asc, per-project hide (eye icon, persisted `deployTabHiddenProjects`) with a `show hidden` toggle button (dimmed rows + un-hide), run count + last-run status badge per project, `all projects` row on top. Layout becomes Col 5 sidebar / Col 7 runs list / Col 12 detail; runs list respects selection + hidden even in 'all'; selection auto-corrects to first visible run when filters change; reload button moves to the runs column header.
- **Done**: implemented as planned. Extra fixes found during browser testing: a stale persisted `deployTabProject` from the old dropdown session (e.g. `a-farmer-in-need`) filtered everything out → added fallback to 'all' when the selection has no runs; 'all projects' count now ignores the selected project (`allVisibleCount`); badge uses `newestVisibleRun`. Hidden projects stay out of the runs list even in 'all' view; hiding the selected project resets to 'all'. Verified in browser: hide (feat@github disappeared from sidebar + runs, `show hidden (1)` appeared), show hidden (dimmed row + eye to restore), search narrows sidebar only (runs follow selection — by design), project select filters runs to 1 and highlights the row; visual check of the 3-column layout OK. `tsc` touched-files clean, `parcel build` OK. Test runs (900301-900303) seeded for the check and deleted afterwards.

## Plan (2026-11-15) - Wake sleeping Render back from deployed web
- **Why**: stat deployed via slave repo `two-brothers` — web on Vercel (`two-brothers-navy.vercel.app`), back on Render free tier (`stat-3lmc.onrender.com`) which sleeps when idle; the deployed web's API calls time out on cold start.
- **REVERTED (same day, user request)**: implemented the plan (ensureAwake wake-poll in api.service.ts), then user asked to undo; `git checkout -- web/src/api.service.ts` restored it to HEAD. No code change remains.

### Progress (2026-11-14) - Deploy visual schema implemented
- Back: `core/ensure_deploy_columns.ts` added (ran on first boot: `[ensure_deploy_columns] added: workflowRunId, workflow, commitMessage, steps`); `/add-event` builds the INSERT dynamically (new fields stored only when sent; `steps` accepts a JSON array OR array-string — array form is coerced, found via curl test); new `POST /get-deploy-runs` groups by workflowRunId into `{workflowRunId, projectId, namespace, commitMessage, tag, startDate, endDate, hasError, stages{MASTER_START/END/ERROR, SLAVE_START/END/ERROR}, events[]}` with parsed steps. `tsc --noEmit` clean.
- Web: stat_stages += MASTER_START 1200 / MASTER_END 1400 / SLAVE_START 1600 / SLAVE_END 1800 (legacy kept for history; LineChart falls back to UNKNOWN=0/red for error stages); `getDeployRuns` + DeployRun/DeployEvent in api.service.ts; new `DeployTab.tsx` (runs list left, detail right; Segmented sequence/schema persisted `deployTabView`; project filter persisted `deployTabProject`); 'deploy' tab in LogsPage after 'stat v2'. Schema view restructured to two rows (flow → serf master → slave repo / ↓ / slave action → hosting) after a single row clipped at the panel edge; nodes minWidth 112 + overflowX fallback.
- Verified end-to-end locally: back on :3230 + parcel on :1234; curl-simulated a success run (note@github, run 900111: MASTER_START→MASTER_END[steps]→SLAVE_START→SLAVE_END[steps]) and an error run (feat@github, run 900222: MASTER_START→MASTER_ERROR with steps-so-far, commit message with quotes survived); `/get-deploy-runs` grouped both correctly; browser check of the deploy tab: runs list badges (error/done), sequence timeline with steps chips + "last passed step: safe", schema view with green lit path / dim untaken branches (visual-judge pass). Legacy no-field events still insert (trig RUNTIME 201). Test rows deleted from the DB afterwards (7 rows).
- Back+web dev servers left running (3230/1234). `tsc` touched-files clean; `parcel build` OK.

## Plan (2026-11-15, 2) - feat features in stat@web (like plst@web)
- **Goal**: consume shared feat features from the feat host in stat@web: http-gate, global-loading, wake-up (v3, render way), version-display (v4 badge).
- **Pattern** (ported from plst@web `src/core/features.ts` + `feat-gate.ts` + `layout/FeatureSlot.tsx`, simplified — stat has NO backend `/api/features` endpoint, so bootstrap rows only, no runtime config fetch):
  - `web/src/feat.ts` — FeatureConfig + baked BOOTSTRAP_FEATURES from `process.env.FEAT_URL` (parcel inlines): app-init → wake-up v3 `<wake-server>` attrs target=BACKEND_URL, project=stat, manual (dormant; serves bus wake-up requests; v3 picks render way by URL); app-infra → script-only bus v1, global-loading v1, http-gate v2; app-version → version-display v4 `<deploy-info>` attrs version=TAG_VERSION, project=stat, namespace=web.
  - `web/src/FeatureSlot.tsx` — plst's slot loader minus the backend-config branch (script-per-URL cache, silent failure, script-only rows render nothing).
  - `web/src/feat-gate.ts` — installFeatGateConfig() (rules ERROR:503 + NETWORK, recovery event wake-up payload {target: BACKEND_URL, project: 'stat'}, timeoutMs 200000) + waitForFeatGate() (3s bound) + gatedFetch() transport (window.featGate?.request ?? fetch).
  - `web/src/index.js` — installFeatGateConfig() before render. `LogsPage.tsx` — mount the three slots above the Tabs.
  - `web/src/api.service.ts` — the 6 API fns fetch via gatedFetch (NOT the render.com `/v1` logs call — different origin, no gate). GetUpdates.tsx add-event left plain (separate route without slots → no gate there anyway).
  - `web/.env` += `FEAT_URL=http://localhost:5477` (dev); prod deploy .env carries FEAT_URL=https://feat.twc1.net + BACKEND_URL=render URL.
- Verify: parcel build; feat dev on :5477 serving v3; browser check that bundles load + badge renders; tsc on touched files.

### Progress (2026-11-15, 2) - feat features in stat@web implemented
- New `web/src/feat.ts` (FeatureConfig + baked BOOTSTRAP_FEATURES from FEAT_URL: wake-up v3/wake-server app-init, bus v1 + global-loading v1 + http-gate v2 app-infra script-only, version-display v4/deploy-info app-version), `web/src/FeatureSlot.tsx` (plst slot loader, bootstrap-only — no backend /api/features), `web/src/feat-gate.ts` (installFeatGateConfig: rules ERROR:503+NETWORK, recovery wake-up {target: BACKEND_URL, project: stat}, timeoutMs 200000; waitForFeatGate 3s bound; gatedFetch transport).
- `index.js` installs gate config before render; `LogsPage.tsx` mounts app-init (wake-server target/manual/project), app-infra, app-version (deploy-info version/project/namespace) above the Tabs.
- `api.service.ts`: the 6 API fns now use gatedFetch (window.featGate?.request ?? fetch); render.com `/v1/logs` call and GetUpdates.tsx add-event stay plain fetch. `web/.env` += FEAT_URL=http://localhost:5477 (dev; prod deploy .env needs FEAT_URL=https://feat.twc1.net).
- Removed old local `VersionDisplay` (bottom-right corner text — overlapped the feat badge's fixed bottom-right position); StatPanel header keeps ThemeToggle only.
- Verified live (feat :5477 + back :3230 + web dev :1230, IAB): all 5 feat bundles load from :5477, featBus + featGate present, wake-server present with manual + target localhost:3230, deploy-info mounted (badge hidden at 0.0.0.0 by design; setAttribute version=v1.0.20 → badge "v1.0.20" + detail rows project/namespace render); gate.request POST /get-projects-status → 200; page tabs/data render normally after StatPanel edit. `parcel build` OK; tsc errors in new files fixed (React UMD import in FeatureSlot) — remaining errors pre-existing (DateSelect/LineChart/GetUpdates/helpers). Dev servers stopped after check (5477/3230/1230 free).
- feat docs Consumers rows updated (wake-up/http-gate/version-display + stat js-web). NOT deployed — needs stat `-d` deploy; prod slave .env must carry FEAT_URL=https://feat.twc1.net and BACKEND_URL=https://stat-3lmc.onrender.com (already known pattern).

## Plan (2026-11-15, 3) - Wake via noy (direct render way failed in prod)
- **Why**: wake-up v3's direct render way can't wake stat@back from the deployed web (browser-side poll against the sleeping Render origin doesn't cut it cross-origin).
- **Plan**: route the wake through noy@back (deployed at https://ed-j5jw.onrender.com, passed as env on deploy): `feat-gate.ts` gains `noyProxy()` from `process.env.NOY_URL`; gate recovery payload and the LogsPage `<wake-server>` attrs get `mode: 'noy'` + `proxy` when NOY_URL is set (dev, empty NOY_URL → direct mode unchanged). `web/.env` += `NOY_URL=` (empty placeholder, deploy injects the real one). Verify live in IAB: boot feat + web dev with NOY_URL, fire the real bus wake-up request from the page and watch it go through noy (noy itself cold-starts on Render — expected).

### Progress (2026-11-15, 3) - noy wake wired; blocked on noy CORS deploy
- `feat-gate.ts`: `noyProxy()` (NOY_URL env) + `wakeOpts()` ({mode:'noy',proxy} when NOY_URL set, {mode:'direct'} otherwise); gate recovery payload += wakeOpts(). `LogsPage.tsx` wake-server attrs += wakeOpts(). `web/.env` += `NOY_URL=` placeholder (deploy injects https://ed-j5jw.onrender.com). Build OK, touched files type-clean.
- Live IAB test (web dev with NOY_URL=https://ed-j5jw.onrender.com, feat :5477): attrs + recovery payload correctly carry mode=noy/proxy. Fired the real bus wake-up for stat-3lmc.onrender.com through noy → failed fast with "noy unreachable": **noy@back sends no CORS headers**, the cross-origin fetch is blocked browser-side before reaching noy. Fixed in noy (`back/app.js` ACAO middleware, verified locally — see noy/DECISIONS.md); needs a noy deploy, then retest. Dev servers feat:5477 + web:1230 left running for the retest.
