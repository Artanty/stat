# DECISIONS.md

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
