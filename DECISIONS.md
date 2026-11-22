# DECISIONS.md

## Task: slot-based feature mounting (2026-11-20, 3)

### Result
- Per user direction ("project must not know the feature"), stat@back migrated to the feat
  `backend-slots` loader (spec: feat/back/spec/backend-slots.md): vendored
  `features/loader.js`(+.d.ts); app.ts now imports ONLY the loader and calls
  `await mountBackendFeatures(app)` — the attachReq import and feature comment are gone.
  Config moved to env: `FEAT_REQ_MOUNT=/req` (toggle+placement), recipes unchanged.
  `.env.example` updated. tsc clean; E2E via the real loader verified (req mounted,
  token injected, 200).

## Task: retrigger button via feat `req` (2026-11-20, 2)

### Result
- back: vendored `feat/back/features/req/v1/js-node/req.js`(+.d.ts) → `back/features/req/`
  (`// VENDORED` header); mounted at `GET|POST /req/:name` (authless,
  consistent with the rest of stat back; now via the backend-slots loader, see entry 3).
  npm run typecheck clean. Recipe envs in new
  `back/.env.example` (FEAT_REQ_RETRIGGER_* → flow /retrigger; `{{project}}` param —
  unlike safe, project comes from the CALLER so any project can be retriggered from the
  runs UI).
- web: `retriggerRun()` in api.service.ts (plain fetch to BACKEND_URL/req/retrigger —
  stat back has no auth) + ↻ Button (ReloadOutlined, Tooltip) in DeployTab run-detail
  header next to `run <id>`; loading state, antd message success/error, loadRuns()
  refresh after. tsc clean (only pre-existing DatePicker error).
- E2E (local express + mock flow, feat side): 200 with Bearer injected + body
  substituted; unknown recipe 404. Full loop: button → stat back recipe → flow
  /retrigger → GitHub rerun + RETRIGGER stat event → run card moves to top with the
  retriggered badge (shipped earlier today).
- NOT deployed — stat back+web `-d` commits are the user's call; FEAT_REQ_RETRIGGER_*
  rows must be added to the deployed .env.

## Task: RETRIGGER visibility — rerun marker event + last-activity run ordering

### Plan (2026-11-20)
- Manual reruns via flow /retrigger are invisible in stat: same workflowRunId → same run
  bucket, startDate keeps the original attempt's date, sort is startDate desc → run
  stays in old position (web list + mini sdui runs[0]).
- Design: flow posts a stage='RETRIGGER' /add-event with the run's workflowRunId (run
  metadata, NOT a workflow stage). stat deployRuns.ts: keep it out of the stage map
  (not in DEPLOY_STAGES), set run.retriggered/retriggeredAt (latest date wins), sort
  runs by LAST event eventDate desc (last activity) instead of startDate — one sort
  change fixes web list and mini. DTO + web DeployRun type + badge on run card header
  (DeployTab ~314) + mini chip next to v{tag} with retrigger time (miniEnvelope +
  MiniPage twin). No storage/schema change; ext untouched.
- flow change logged here too (flow repo has no DECISIONS.md): rerun.ts posts the event
  fire-and-forget after successful reReWorkflow, modeled on sendRuntimeErrorToStat.

### Result (2026-11-20)
- flow/back: rerun.ts posts the RETRIGGER stat event (axios fire-and-forget, .catch
  logged) after successful reReWorkflow; StatPayload gained optional workflowRunId.
  tsc --noEmit clean (no test runner wired in flow back).
- stat/back deployRuns.ts: DeployRunDto + retriggered/retriggeredAt (latest RETRIGGER
  event wins, kept out of stages), runs sort switched startDate desc → endDate (last
  activity) desc. Verified with fake pool via tsx: old run + RETRIGGER + rerun events
  sorts first, flag set, stage map/tag intact. Typecheck clean.
- stat/web: DeployRun type extended; DeployTab run card + MiniPage get a purple
  "retriggered" Tag (Tooltip with retriggeredAt; MiniPage also a retriggered-at line).
  tsc: only a pre-existing DatePicker defaultValue error remains (unrelated files).
- mini sdui miniEnvelope.ts: yellow "↻ retriggered" header item + "retriggered <at>"
  line; smoke-built envelope via tsx OK. ext untouched.
- NOT deployed — flow + stat (back/web) need deploys (user's call). Effect live only
  after BOTH: flow must post the event, stat must interpret it.

## Task: SDUI polish — theme-aware colors, status simplification, header row layout

### Plan (2026-11-18, 2)
1. miniEnvelope palette theme-aware via expressions on the host global `theme` var (theme-changer pattern): project name near-black in light / near-white in dark (fixes white-on-white), same for text/muted/chip-unlit/separator grays. Accent colors (green/red/blue/yellow) constant.
2. STATUS_META 'master-done' label → 'done' in web deployTimeline.tsx + miniEnvelope (timeline carries the details).
3. SDUI header row: `[status icon] projectName | namespace | version` — icon (✓ green done / ✓ yellow master-done / ✕ red error / ● gray running) before project name; namespace after name; 3 items, not 4.

### Progress (2026-11-18, 2)
- DONE, verified in CfT light + dark. NOT deployed (needs stat `-d`).
- miniEnvelope.ts: palette theme-aware via `@{theme == 'dark' ? … : …}` expressions on the ext host global (theme-changer pattern): strong/text/gray/unlit/line switch; green/red/blue/yellow constant. STATUS_META master-done label → 'done' (also web deployTimeline.tsx). Header row now `[✓|✕|● colored] projectName | namespace | v{tag}` — 3 items + icon (✓ green done / ✓ yellow master-done / ✕ red / ● gray running), status text label dropped from the row.
- Verified computed colors: light `stat@github` #111827 on white; dark #F9FAFB on #111827 (screenshots web-ext/.e2e/theme-light.png, theme-dark.png). back tsc clean; web tsc only pre-existing rc-picker error.
- ext side (support): builtin.ts gained `STAT_DIRECT=1` build flag (direct fetch bypassing thru; local-dev only — thru target localhost resolves on the feat host, so local stubs must bypass; documented in .env.example). Final build prod-pointed, typecheck + 21 tests green.
- FOUND ext BUG (not fixed, user's theme-changer thread): theme persistence clobbers at boot — DivKit `variable.subscribe` fires IMMEDIATELY with the current value, so `applyTheme('light')` at initShell writes `theme: 'light'` to storage before the boot read of the stored value; a stored 'dark' never survives a reload (verified: set dark → reload → light). Dark-theme test required a temp default-dark build (reverted).

## Task: deploy tab — namespace filter in runs block

### Plan (2026-11-18)
- Runs column header (next to "N runs" + reload) gains a small Select 'namespace' with options derived from the loaded runs (all/web/back/… — extensible, no hardcoded list), default 'all', persisted `deployTabNamespace`.
- `visibleRuns` additionally filters by namespace; derived counts (allVisibleCount, newestVisibleRun) follow too. Selected-run fallback effect already re-picks when list changes.

### Progress (2026-11-18)
- DONE in DeployTab.tsx: `namespace` state (persisted `deployTabNamespace`), `namespaces` memo derived from runs (sorted unique — extensible, no hardcoded list), shared `nsOk` filter applied to visibleRuns + allVisibleCount + newestVisibleRun; runs header shows small Select ('all ns' + options) beside the count; stale persisted ns falls back to 'all'. tsc: only pre-existing rc-picker node_modules error; parcel build OK. NOT deployed — needs stat `-d`.

## Task: date display cleanup (web + SDUI)

### Plan (2026-11-18)
- Header datetime row: date shown ONCE from start, then bare times: `16.11.2026, 17:52:21 → 17:53:41` — even across midnight, no second full date (user: "its obvious"). New `fmtTime` + `fmtRange` in deployTimeline.tsx, used by MiniPage + DeployTab run headers.
- Timeline stage labels: time only.
- SDUI miniEnvelope: explicit `dd.mm.yyyy, hh:mm:ss` (Node locale ≠ browser), same fmtRange + time-only stages.

### Progress (2026-11-18, 1)
- DONE, verified. NOT deployed.
- web: deployTimeline.tsx adds `fmtTime` (toLocaleTimeString) + `fmtRange` (`fmtDate(start) → fmtTime(end)`, date once — no same-day check, cross-midnight also collapses); timeline stage labels (push()) now fmtTime. MiniPage + DeployTab run headers use fmtRange; DeployTab run-list rows keep fmtDate.
- back/miniEnvelope.ts: explicit `dd.mm.yyyy, hh:mm:ss` fmtDate + hh:mm:ss fmtTime + same fmtRange; timeText → fmtTime. (Node toLocaleString would be en-US.)
- Verified: back tsc clean; live envelope header `18.11.2026, 10:44:31 → 10:46:12` with bare-time stages. web tsc: only pre-existing rc-picker node_modules typings error. Parcel served a stale bundle until cache cleared (recurring gotcha) — after rm .parcel-cache/dist + restart, fresh bundle contains the new helpers (dev port this run: 49961).
- Follow-up: SDUI header row now leads with the project name (no selector in the envelope to identify the run): `[feat@github] [done] [v0.0.37.0.0.0] [back]` — project in bright text, status keeps its color. Verified live.

## Task: /mini → SDUI envelope for ext host

### Plan (2026-11-17)
- Goal: ship the /mini deploy widget (latest-run-only, no selector/last/reload) into the ext Chrome-extension host as a DivKit envelope (know: sdui-remote-envelope.md).
- Data baked in server-side (DivKit = pure data, no JS): stat back adds `GET /mini/envelope.json` (no-cache), built by pure `back/core/miniEnvelope.ts` porting web/src/deployTimeline.tsx logic (runStatus, chips, hosting). Fallback card "no runs" when empty; errors via appendErrorLog.
- ext side: `STAT_ORIGIN` env (default https://stat-3lmc.onrender.com) → manifest `__STAT_ORIGIN__` host_permissions token + `src/builtin.ts` nav remote `stat-mini` (version-display v5 pattern: runtime fetch + offline cache). Freshness = panel reopen; cold Render ~30s caveat noted, retry deferred.
- No `-d` commits unless user asks.

### Progress (2026-11-17, 13)
- DONE, verified end-to-end locally. NOT deployed.
- back: extracted shared query `back/core/deployRuns.ts` (types + parseSteps + fetchDeployRuns); `/get-deploy-runs` now calls it (no behavior change). New `back/core/miniEnvelope.ts` — pure buildMiniEnvelope(run) emitting the DivKit envelope (schema v2: `items`, no variables/actions; colors ported from STATUS_META: green done / red error / yellow master-done / gray running / blue tag+slave). New route `GET /mini/envelope.json` (no-cache; cors global).
- GOTCHA: versionInterceptor appended `version` to EVERY res.json — broke envelope validation (`/version is not an allowed property`). Fixed: middleware skips `req.path === '/mini/envelope.json'` (pure passthrough payload).
- Verified: tsc clean; live curl on dev back :3230 returns envelope; ext's own validateEnvelope → ok; loaded in Chrome for Testing via CDP → nav shows "Stat", card mounts with full latest-run timeline (screenshot web-ext/.e2e/stat-mini.png). Visual pass: layout readable; minor aesthetics only (no timeline rail between dots, chips are colored text tokens).
- ext (repo ext/): `STAT_ORIGIN` env (example default prod Render; local .env currently `http://127.0.0.1:3230` for e2e — flip to prod when trying for real), `__STAT_ORIGIN__/*` in manifest host_permissions (build.mjs define + token replace), `src/builtin.ts` nav remote `stat-mini` (GET allowlist on STAT_ORIGIN). ext typecheck + 21 tests + build green; stock e2e's feat badge / notes-submit checks fail only for env reasons (feat.twc1.net fetch + 8787 stub not running), unrelated.

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
- **Why**: stat deployed via slave repo `two-brothers` — web ~~on Vercel (`two-brothers-navy.vercel.app`)~~ (CORRECTION 2026-11-15: stat@web was NEVER current on that URL this session — it moved to **https://stat.twc1.net/** Timeweb hosting before this work; the vercel URL was a stale inference from SLAVE_REPO env + session notes), back on Render free tier (`stat-3lmc.onrender.com`) which sleeps when idle; the deployed web's API calls time out on cold start.
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
- `feat-gate.ts`: `noyProxy()` (NOY_URL env) + `wakeOpts()` ({mode:'noy',proxy} when NOY_URL set, {mode:'direct'} otherwise); gate recovery payload += wakeOpts(). `LogsPage.tsx` wake-server attrs += wakeOpts(). `web/.env` += `NOY_URL=` placeholder (deploy injects the noy URL). Build OK, touched files type-clean.
- Live IAB test (web dev with NOY_URL=https://ed-j5jw.onrender.com, feat :5477): attrs + recovery payload correctly carry mode=noy/proxy. Fired the real bus wake-up for stat-3lmc.onrender.com through noy → failed fast with "noy unreachable": **noy@back sends no CORS headers**, the cross-origin fetch is blocked browser-side before reaching noy. Fixed in noy (`back/app.js` ACAO middleware, verified locally — see noy/DECISIONS.md); needs a noy deploy, then retest. Dev servers feat:5477 + web:1230 left running for the retest.
- **UPDATE (later, user decision)**: Render is out for noy too — noy@back moves to **Timeweb virtual hosting** (always awake, no Vercel function-timeout cap). The ed-j5jw.onrender.com address above is historical; deploy will pass the new noy URL via NOY_URL env. CORS fix rides along with that deploy.

## Plan (2026-11-16) - Pre-request warm for the feat host (TW VH cold start)
- **Why** (HAR 10:09, stat.twc1.net): all 5 feat script loads from feat.twc1.net failed status 0 in ~50ms (cold Passenger on TW VH fails the first burst fast), so the gate never loaded and the API POST to the sleeping Render back died as a plain 18s network error. Live check later: same URLs 200 in ~350ms — cold-only failure. noy.twc1.net deployed OK (healthz), but it sits behind a gate that never loaded.
- **Plan**: `web/src/feat.ts` gains `featHostReady()` — one shared promise that polls `FEAT_URL/manifest.json` (CORS-able, version-display already fetches it cross-origin) until ok, 1s interval, 60s budget, resolves (not rejects) on timeout so scripts still get a chance. `FeatureSlot` SlotRow awaits it before injecting scripts; `waitForFeatGate()` awaits it before its 3s gate poll. Chain: warm feat → bus/gate/wake-up load → gatedFetch failure triggers bus wake-up → noy.twc1.net wakes stat back → retry.

### Progress (2026-11-16) - feat host warm + END-TO-END WAKE VERIFIED
- `feat.ts` += `featHostReady()` (shared promise: poll FEAT_URL/manifest.json every 1s until ok, 60s budget, always resolves); `FeatureSlot` SlotRow warms before injecting scripts; `waitForFeatGate()` awaits the warm first (feat-gate.ts, dynamic import to avoid a static cycle). Build OK, touched files type-clean.
- **Live end-to-end wake VERIFIED** from the dev page (feat :5477 local): `featBus.request('wake-up', {target: https://stat-3lmc.onrender.com, mode: 'noy', proxy: https://noy.twc1.net, project: 'stat'})` → `{awake: true, attempts: 1, strategy: 'render', elapsedMs: 61321}` — noy.twc1.net (TW VH, awake, CORS fix live) woke the sleeping Render back in 61s.
- Deployed chain after stat `-d`: page load → warm feat.twc1.net (cold Passenger answers within the poll loop) → bus/gate/wake-up scripts load → first API POST fails NETWORK (back asleep) → gate parks, requests wake-up → noy wakes stat back (~60s) → parked request retries → data renders. NOT yet deployed — needs a stat `-d` (envs: FEAT_URL=https://feat.twc1.net, NOY_URL=https://noy.twc1.net, BACKEND_URL=https://stat-3lmc.onrender.com).

### Progress (2026-11-16, 2) - wake-up v4 (noy cold retry) pinned; deploys pending
- stat web `feat.ts` wake-up row v3 → v4 (+ comment). Build OK. feat v4 details in feat/DECISIONS.md (77/77 tests; runNoy retries a cold TW-VH noy every 3s within the budget; bus payload proxy/project now honored).
- Deploy order: 1) feat `-d` (ships v4 — feat.twc1.net currently 404s on it), 2) stat `-d` (picks up the v4 pin; FEAT_URL=https://feat.twc1.net + NOY_URL=https://noy.twc1.net + BACKEND_URL already in the deployed env per the 10:44 HAR — that deploy's warm+gate+wake chain all worked; only the noy call died cold, which v4 fixes).

## Plan (2026-11-16, 3) - Route stat API traffic thru noy behind explicit env
- User decision: stat@web routes its API calls through noy's new /thru endpoint ONLY when an explicit env exists (THRU_URL; empty = current direct+gate behavior, which stays untouched — wake-up/features working, no changes there).
- Plan: feat-gate.ts gatedFetch gains a thru branch — when THRU_URL is baked: warm the thru host first (poll /healthz, 1s interval, 60s budget — noy is a cold TW-VH Passenger, same fast-fail as feat), then fetch `${THRU_URL}/thru?target=<full API url>&method=&body=` (thru mirrors the upstream response, so callers see an identical Response). Direct branch unchanged. web/.env += THRU_URL= placeholder.

### Progress (2026-11-16, 3)
- feat-gate.ts gatedFetch: THRU_URL branch (thruUrl()/thruHostReady() warm poll /healthz 1s/60s — noy is a cold TW-VH Passenger; then fetch `${THRU_URL}/thru?target=…&method=&body=`, thru mirrors the upstream Response). Direct+gate branch untouched. web/.env += THRU_URL= placeholder. Build OK, type-clean.
- E2E verified locally: noy :3299 (FEAT_THRU=true) + back :3230 + web dev THRU_URL=http://localhost:3299 — stat v2 tab renders live project data; noy log shows the app's real /thru POSTs (get-projects-status) returning 200. Wake-up/features untouched per user.
- Deploy: stat `-d` with THRU_URL=https://noy.twc1.net in the web env (after noy deploys with FEAT_THRU=true). Empty THRU_URL = old direct+gate behavior.

## Plan (2026-11-17) - Deploy tab 3rd view: 'tree' (Diablo-2 skill tree)
- Why: user wants a game-like visualization of the deploy path — master action picks a branch (one of BRANCH_CHIPS), slave action follows it, and each branch ends in a hosting leaf (badge).
- Plan:
  - New `web/src/components/DeployTree.tsx`: vertical tree. Trunk: `tag push` -> `serf master` (chips start/checkout/tech-stack/safe/env-created). Fork into 5 branch columns (vercel-json, render-yaml, ftp-workflow, vh-workflow, vds-workflow). Workflow branches continue through a `slave action` node (chips checkout/build/deploy from slaveSteps) into the hosting leaf; platform branches (vercel-json, render-yaml) go straight to the hosting leaf (no slave — deploys on push). Hosting leaves: vercel / render / ftp / timeweb-vh / vds with distinct colors.
  - Lit/dim/error states as in schema view: taken path glows green (connectors too), untaken dim, failures red. Hosting leaf lit when SLAVE_END (workflow) or MASTER_END (platform).
  - `DeployTab.tsx`: Segmented gains 'tree' option (persisted in deployTabView), passes run/masterSteps/slaveSteps/slaveWorkflowGenerated to DeployTree.

### Progress (2026-11-17) - tree view done, verified live
- Created `web/src/components/DeployTree.tsx` (trunk: tag push -> serf master chips; fork rail into 5 branch columns; workflow branches go slave action (chip chain from slaveSteps) -> hosting leaf; platform branches go straight to hosting leaf). Lit/dim/error states + glowing green connectors; hosting leaves: vercel / render / ftp / timeweb vh / vds with per-host colors.
- `DeployTab.tsx`: Segmented + 'tree' option (persisted), renders `<DeployTree run masterSteps slaveSteps/>`.
- Build + tsc clean. Verified live in IAB: dev web (BACKEND_URL -> render, THRU_URL=https://noy.twc1.net temporarily in web/.env — restored to localhost:3230 after test; Parcel .env changes need `npm run dev`'s delete-parcel-cache or the stale bundle keeps serving) — 21 runs loaded via noy thru, vh-workflow run lights the full path down to the glowing 'timeweb vh' leaf.
- Not deployed yet: needs a stat `-d` to ship on stat.twc1.net.

### Progress (2026-11-17, 2) - tree view redesign (game skill-tree look)
- User found v1 (DOM boxes + thin lines) ugly. Researched skill/tech-tree UI patterns (Game UI Database, D2/D4/PoE/Civ references): the look = compact orb nodes + small labels, thick glowing connectors as the hero, dark radial backdrop, state via glow not opacity.
- Rewrote `DeployTree.tsx` as a single SVG: tag push orb -> serf master tile (step dots) -> diagonal fan-out fork to 5 branch orbs -> workflow branches through slave action tiles -> hosting leaf orbs (host-colored rings + glow). Gold (#faad14) = taken path (D2 vibe, distinct from schema view's green), red = failed, dim = not taken. Legend inside the SVG.
- Iterated with visual-judge passes: raised dim opacity (was unreadable), padding for edge clipping, uniform orb-label gaps, bigger/bolder lit step dots, aligned leaf row. Final pass: no overlaps/clipping, lit path reads clearly.
- Verified live in IAB with 21 real runs (vh-workflow run lights the whole gold path to the glowing 'timeweb vh' leaf). tsc clean. Not deployed — needs stat `-d`.

### Progress (2026-11-17, 3) - tree view restyled modern (user: "no game ui")
- User rejected the gold/glow game look; wants modern UI. Restyled DeployTree SVG flat & minimal: accent blue #1677ff (matches app) for the taken path, thin 1.25-2px connectors, small circular nodes with labels, flat stage cards with step dot-rows, hosting leaves as flat pill badges (status dot + host-colored label), no glow/vignette. Legend flattened.
- Visual-judge pass: no overlaps/clipping, consistent spacing, active path reads clearly, reads as a modern pipeline diagram. Live in dev at :1234 (tab=deploy, view=tree). tsc clean. Not deployed — needs stat `-d`.

### Progress (2026-11-17, 4) - tree view v3: grid of branch cards (user direction)
- User: use ng-zorro-style grid cards — 5 branches as a row of cards, with timeline + tags like the sequence tab. (App is React, so antd equivalents.)
- Rewrote DeployTree.tsx as DOM layout: 'serf master' bar on top (step Tags with arrows) -> caption -> Row of 5 antd Cards (Col flex=1). Workflow cards: antd Timeline (checkout + slave steps + live) with DoneTags; platform cards: push -> live + 'platform deploys on push' note. Hosting = colored antd Tag (default/blue/orange/green/purple). Taken card: blue border + inset ring + blue title; dim cards 0.45 opacity; red for failures.
- Judge-pass fixes: platform caption wraps (render-yaml card was stretching), dim opacity lowered so the taken branch pops. Final visual pass clean. Live in dev (:1234, tab=deploy, view=tree); tsc clean. Not deployed — needs stat `-d`.

### Progress (2026-11-17, 5) - sequence view: full schema-like tag rows
- User asked to add more tags to the sequence view like the schema view. DeployTab timelineItems now render the full chip sets instead of only happened steps:
  - master steps item: MASTER_CHIPS (start/checkout/tech-stack/safe/env-created) + dashed divider + BRANCH_CHIPS (vercel-json/render-yaml/ftp-workflow/vh-workflow/vds-workflow) + push tag — green when taken, dim default otherwise.
  - slave steps item: checkout + actual slave chain chips, same lit/dim treatment.
  - new final 'hosting:' timeline item with the branch's hosting tag (HOSTING_BY_BRANCH map, colors as in tree view); red on failure.
- Removed old stepsTags helper. tsc + build clean; verified live in IAB (vh-workflow run shows green vh-workflow branch tag + 'hosting: timeweb vh'). Not deployed — needs stat `-d`.

## Plan (2026-11-17, 6) - Strip stat to deploy-tab only + namespace badges
- User: remove everything, keep only deploy tab (web + backend); add namespace badge(s) to left project list (like the run card Tag).
- Web: new DeployPage (FeatureSlots + DeployTab, no antd Tabs); App drops DataProvider; delete StatPanel, StatV2Tab, LogsTab, ListTab, GridLayout, LineChart, DateSelect, FilterPanel, CopyButton, ThemeToggle, GetUpdates (+ /get-updates route); api.service.ts trimmed to getDeployRuns only; remove /v1 render-logs proxy if unused.
- Back: keep /add-event (serf workflows POST deploy telemetry to it!), /get-deploy-runs, error log, startup checks; remove /get-last-events, /get-events-list, /get-projects-status, /get-projects, /get-project-entries, /get-updates + helpers (sendRuntimeEventToStat, shouldRunStat, dayjs/retry imports).
- DeployTab: project rows show unique namespace Tag(s) from that project's runs (like the run card's <Tag>{namespace}</Tag>).

### Progress (2026-11-17, 6) - stat stripped to deploy-only + namespace badges
- Web: DeployPage.tsx replaces LogsPage (FeatureSlots + DeployTab, no Tabs bar); App drops DataProvider; index.js loses /get-updates route + grid css; api.service.ts trimmed to getDeployRuns + types; deleted StatPanel/StatV2Tab/LogsTab/ListTab/GridLayout/LineChart/DateSelect/FilterPanel/CopyButton/ThemeToggle/LogsPage/GetUpdates/models/helpers/d.ts/services/store.js + .proxyrc.json (render logs proxy).
- Back: app.ts keeps /add-event (serf telemetry ingestion!) + /get-deploy-runs + error log + startup; removed /get-last-events, /get-events-list, /get-projects-status, /get-projects, /get-project-entries, /get-updates + runtime-stat helpers; dayjs/retry imports dropped. tsc clean.
- DeployTab: projects useMemo collects unique namespaces; ProjectRow renders small namespace Tags (run-card style) beside the project name.
- Verified live in IAB: app boots straight into deploy view, 22 runs via noy thru, project rows show back/web namespace badges. NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 7) - schema & tree views removed
- User: remove schema and tree views. DeployTab: deleted Segmented + view state (deployTabView), SchemaNode/Chip/Arrow components, schema JSX and tree branch; only the sequence Timeline remains (with its full tag rows). Deleted web/src/components/DeployTree.tsx.
- tsc + build clean; verified live (no segmented control, timeline renders, runs load). NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 8) - page scroll removed, per-column scrolls
- User: no whole-page scroll; independent scrolls for projects list, run list, timeline (when needed).
- style.css: html/body/#root height 100%, body overflow hidden. App wrapper: height 100vh flex column. DeployPage: flex 1 minHeight 0 flex column. DeployTab root + Row flex 1 minHeight 0; each Col = flex column minHeight 0; the three list regions (projects, runs, timeline) are flex-1 minHeight-0 overflowY auto (antd Space wrappers replaced with plain flex divs — Space items break flex children).
- Verified live: body no longer scrolls; run list scrolls internally (2046px content in 656px); projects/timeline scroll only when content exceeds. Bonus: bundle dropped 4.17MB -> 1.69MB (charts finally tree-shaken after tab removals). NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 9) - thin themed scrollbars
- style.css: global `* { scrollbar-width: thin; scrollbar-color: var(--border-input) transparent; }`. theme.tsx ThemeProvider effect sets `--border-input` on :root from theme tokens (#333 dark / #d9d9d9 light), so scrollbars follow the theme; fallback #333.
- Verified live (parcel cache needed clearing again — delete-parcel-cache before dev server restart): var resolves, scrollbar-width computed 'thin'. NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 10) - no horizontal scroll in timeline block
- Timeline scroll container: overflowX hidden + word-break; style.css timeline rules — .ant-timeline-label width 100%, item-label nowrap+ellipsis, item-content min-width 0 / max-width calc(50% - 22px) / break-word so tag rows wrap instead of overflowing.
- Verified live: container no longer reports horizontal overflow; tag rows wrap (branch tags onto two lines), nothing clipped. NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 11) - /mini compact deploy page (route only)
- New route /mini (index.js MiniApp; no link/tab anywhere). MiniPage.tsx: 490px column, block under block — (1) project Select (options with run counts, defaults to first), (2) last-run info (status badge, version tag, namespace tag, commit message, start→end datetime; runs come newest-first so last run = first match), (3) full timeline block (no header, own 70vh vertical scroll, same wrap/truncate rules).
- Extracted the shared sequence-timeline builder from DeployTab into web/src/deployTimeline.tsx (STATUS_META, runStatus, fmtDate, chips, HOSTING_BY_BRANCH, buildTimelineItems) — DeployTab now imports it; both pages render identical timelines.
- Verified live at localhost:1234/mini (project select + feat@github last run + timeline with wrapped tag rows). tsc clean. NOT deployed — needs stat `-d`.

### Progress (2026-11-17, 12) - /mini: 'last' toggle + borderless reload
- Project block header now: 'project' label left; right side = small Switch 'last' + borderless text-type ReloadOutlined icon button.
- last OFF: select enabled, reload button active — click re-fetches runs (whole block info).
- last ON: select disabled and pinned to the project of the newest run (runs arrive newest-first, so runs[0].projectId); everything auto-reloads every 60s (setInterval, cleaned up on toggle off); reload button disabled.
- Verified live in IAB both states. tsc clean. NOT deployed — needs stat `-d`.

### Plan/Progress (2026-11-18, 13) - master-done badge green
- Cause: newest run (stat@github back 1.0.22.1.0.28) has only MASTER_START/MASTER_END (no slave events ingested) -> runStatus 'master-done' -> warning(yellow). User: last deploy succeeded, want green.
- Change: deployTimeline.tsx STATUS_META['master-done'].badge warning -> success. 'master-done' state kept (distinguishes runs w/o slave events) but renders green like 'done'.
- Scope: web only; NOT deployed — needs stat -d.

### Plan (2026-11-21, 14) - wire feat get-updates (runtime info endpoint)
- feat shipped get-updates v1 (js-node) + loader v2 today (feat DECISIONS 2026-11-21):
  GET /get-updates reports deploy identity (TAG_VERSION/COMMIT_ID/COMMIT/PROJECT_ID/
  SLAVE_REPO/NAMESPACE envs), framework + packages from package.json, mounted feat
  features, env presence map (values never sent). Slot backend-get-updates.
- Steps: vendor loader v2 over features/loader.js/.d.ts (needed for the underscore ID
  FEAT_GET_UPDATES_MOUNT; single-word ids like REQ behave as v1, req unaffected);
  vendor features/get-updates/{get-updates.js,get-updates.d.ts} from
  feat/back/features/get-updates/v1/js-node/; add FEAT_GET_UPDATES_MOUNT=/get-updates
  to .env + .env.example (Render dashboard row needed too); tsc + local boot smoke
  (curl /get-updates, check version/framework/packages/features/envs + req still
  mounted); stop dev server. stat is authless by design — mount path stays public
  (same exposure the old hand-rolled /get-updates had).

### Progress (2026-11-21, 14) - get-updates wired via loader v2, smoke OK
- Vendored features/loader.js/.d.ts = feat loader v2 (underscore IDs → hyphen dirs) and
  features/get-updates/{get-updates.js,get-updates.d.ts} (feat get-updates v1).
  FEAT_GET_UPDATES_MOUNT=/get-updates added to .env + .env.example. tsc clean.
- Local boot smoke (PORT=4577, tsx): GET /get-updates → version 0.0.0.0 (package.json,
  TAG_VERSION unset locally — Render CI injects it), framework express@^4.19.2, full
  packages map, features ["get-updates","req"], env presence map only. req still mounts
  through v2 loader (unknown recipe → 404 from its handler). Server stopped, port free.
- NOT deployed: needs stat -d; Render dashboard also needs the FEAT_GET_UPDATES_MOUNT
  row (local .env is not read in prod). Public by design — stat is authless; same
  exposure as the old hand-rolled /get-updates removed 2026-11-17 (6).
- User correction (same day): the endpoint must NOT exist by default — stat's repo/env
  default is dormant; config passed at DEPLOY time decides. Removed the active
  FEAT_GET_UPDATES_MOUNT row from .env; .env.example keeps it COMMENTED OUT with a
  dormant-by-default note. Re-verified both states (PORT=4577): without the row
  GET /get-updates → 404 (route absent; req unaffected); with the row injected at
  runtime → 200 full payload, features ["get-updates","req"]. Server stopped, port free.
  Prod enable = uncomment/set the row in the Render dashboard, not in the repo.
- Rework (2026-11-22): consumer repos must carry NO feature files — feat loader v2.1
  fetches features remotely. stat/back/features/get-updates/ DELETED; loader.js/.d.ts
  re-vendored (v2.1). .env.example documents the deploy-time rows (all commented,
  dormant by default): FEAT_URL=<feat host> + FEAT_GET_UPDATES_MOUNT=/get-updates.
  req/ stays as a local pinned copy (local-first wins) — can go remote later.
  E2E vs local feat :5477: rows set → /get-updates 200 (code fetched from feat at
  boot, features ["get-updates","req"]); row absent → 404 route-absent. Servers
  stopped, ports free. Prod enable = set both rows in Render env + stat -d (which
  also needs feat deployed first for prod FEAT_URL to serve get-updates).
- Cleanup (2026-11-22, 2): features/req/ DELETED too (leftover from the 2026-11-20
  manual-vendor wiring, predates loader v2.1 remote resolution). stat now vendors ONLY
  features/loader.js + loader.d.ts. tsc clean; e2e vs local feat :5477 with
  FEAT_URL + FEAT_REQ_MOUNT + FEAT_GET_UPDATES_MOUNT: both features fetched from feat
  at boot (features ["get-updates","req"]; /req/unknown → 404 from req's own handler).
  Servers stopped. Rule "Features live in feat only" recorded as rule 4 in
  know/entries/rules.md. Render env needs FEAT_REQ_* recipe rows unchanged.
- Loader v3 (2026-11-22, 3): stat re-vendored loader.js/.d.ts = v3 named slots. Env
  contract changed: FEAT_<ID>_SLOT row is the toggle (FEAT_REQ_SLOT=route,
  FEAT_GET_UPDATES_SLOT=route); paths come from the features (get-updates
  defaultMount /get-updates), _MOUNT only overrides. No stat code changes (still one
  mountBackendFeatures call, zero feature files). tsc clean; e2e vs feat :5477: with
  the two SLOT rows → /get-updates 200 + req mounted; without → both 404 dormant.
  Render env after feat deploys: FEAT_URL + FEAT_REQ_SLOT=route (+ existing recipe
  rows) + FEAT_GET_UPDATES_SLOT=route.

### Progress (2026-11-22, 15) - retriggerRun routed via feat thru (cold-Render fix)
- HAR (input/stat.twc1.net.har): retrigger POST + OPTIONS to stat-3lmc.onrender.com
  both status 0 — Render free tier asleep, cross-origin preflight never answered.
  getDeployRuns survives via gatedFetch (wake-up gate); retriggerRun used a bare fetch.
- web api.service.ts: retriggerRun now calls the feat thru feature (spec
  feat/back/spec/thru.md): GET ${THRU_URL}?target=<BACKEND_URL>/req/retrigger&method=
  post&body={project}&timeout_s=120 — thru (always-on at feat.twc1.net/thru, verified
  200 on prod) fetches server-side; that fetch wakes Render; 120s covers the cold
  start (thru default 30). THRU_URL row added to .env (feat.twc1.net/thru; dev can
  point at local feat flask :5477). Note: distinct from the old THRU_URL1/noy
  all-API experiment — this routes ONLY retrigger. tsc: only the pre-existing
  rc-picker error.
- E2E local (mock flow :4590 + feat flask :5477 + stat tsx :4577, req feature loaded
  REMOTELY via loader v3 SLOT rows): thru?target=…/req/retrigger&method=post&body=
  {"project":"safe@web"} → mock flow received POST /retrigger with Authorization:
  Bearer testtok and body {"project":"safe@web"} — token injected server-side,
  param substituted, whole chain green. Servers stopped. Needs stat -d to ship.
- Doctrine fix (2026-11-23, 16): stat web no longer knows retrigger/thru —
  api.service.retriggerRun + THRU_URL removed (supersedes entry 15's thru patch);
  DeployTab renders <FeatureSlot slot="run-retrigger">; the row in feat.ts fills it
  with feat redeploy v2 (src=BACKEND_URL/req/retrigger, thru=FEAT_URL/thru from env);
  the thru transport lives in the feature. parcel build clean. Needs feat -d first
  (redeploy v2 must exist on the feat host), then stat -d; until then the slot is
  silently dark.
