# Deploy visual schema — events from serf workflows + visualization in stat web

## Event model (replaces PUSH_MASTER / GET_SAFE / PUSH_SLAVE / UNKNOWN)

All events POST to `stat /add-event` (extended, backward-compatible):

```json
{
  "projectId": "note@github",
  "namespace": "back",
  "stage": "MASTER_END",
  "isError": false,
  "eventData": "1.2.3.4.5.6",
  "workflow": "master" | "slave",
  "workflowRunId": "<serf run id>",
  "commitMessage": "fix title -d;",
  "steps": "[\"start\",\"checkout\",\"safe\",\"vds-workflow\",\"env-created\",\"pushed\"]"
}
```

**Stages:** `MASTER_START`, `MASTER_END`, `MASTER_ERROR` (isError=true, steps so far), `SLAVE_START`, `SLAVE_END`, `SLAVE_ERROR`.

**Linking key:** `workflowRunId` = serf master run's `github.run_id`. Master writes it into the slave `.env` (`WORKFLOW_RUN_ID=...`); slave events read it via `get_env`. One id links the whole deploy in stat (a re-run gets a new id → new sequence). Server-start event: skipped for now.

## 1. serf — `.github/workflows/deploy.yml`

- Init `DEPLOY_STEPS=` in `GITHUB_ENV` right after "Set working directory"; append milestone/branch marks (~10, inline in existing `run:` steps where possible, tiny marker steps only after `uses:` milestones): `start, checkout, tech-stack, safe, vercel-json?, render-yaml?, ftp-workflow?, vh-workflow?, vds-workflow?, env-created, pushed`. Conditional marks appear only when the branch is taken — the array is the path taken.
- Replace the 4 stat steps: `PUSH_TO_MASTER` → **MASTER_START** (workflow/runId/commitMessage, jq-built JSON — commit messages can contain quotes, so switch these steps from `http-request-action` inline JSON to `run:` + `jq -n --arg` + `curl --retry`); delete **GET_SAFE** (covered by steps path); `PUSH_SLAVE` → **MASTER_END** (with full steps); `UNKNOWN` → **MASTER_ERROR** (`if: failure()`, isError=true, steps so far).
- "Create .env file": add `WORKFLOW_RUN_ID=${{ github.run_id }}`.
- All 6 generated slave workflow variants (vh-web, vh-back-python, ftp-web, ftp-back, vds-prisma, vds-slim): first step sends **SLAVE_START** (jq+curl from `get_env STAT_URL/PROJECT_ID/NAMESPACE/WORKFLOW_RUN_ID/COMMIT`) and inits `DEPLOY_STEPS`; marks appended per step (checkout/build/deploy — few steps each); final step sends **SLAVE_END**; `if: failure()` step sends **SLAVE_ERROR**. Plain shell only inside heredocs (no `${{ }}`; `if: failure()` passes through untouched).
- Note: vercel/render/surge/PaaS_snap have no slave workflow — those runs end at MASTER_END (schema view shows the platform node).
- Plan → `serf/DECISIONS.md` before coding, progress after (per serf AGENTS.md; **no commits unless asked**).

## 2. stat back (`back/`)

- `back/core/ensure_deploy_columns.ts` (new): idempotent startup check via INFORMATION_SCHEMA + `ALTER TABLE events ADD COLUMN` for missing: `workflowRunId VARCHAR(64)`, `workflow VARCHAR(16)`, `commitMessage VARCHAR(512)`, `steps TEXT` (all NULL-able). Awaited before `listen`.
- `/add-event`: extend `AddEventBody` + build INSERT dynamically so only provided new fields are inserted.
- New `POST /get-deploy-runs`: filters `{projectId?, workflowRunId?, dateRange?, limit?}`; selects events where `workflowRunId IS NOT NULL`, groups in JS by `workflowRunId` → `{workflowRunId, projectId, namespace, commitMessage, tag, startDate, endDate, hasError, events[], stages: {masterStart/masterEnd/masterError/slaveStart/slaveEnd/slaveError}}`, `{data: runs}`.
- `tsc --noEmit` clean.

## 3. stat web (`web/`)

- `models.ts`: add new stages to `stat_stages` (keep legacy PUSH_MASTER/GET_SAFE/PUSH_SLAVE/UNKNOWN mappings so historical charts keep rendering): e.g. SLAVE_END=1800, SLAVE_START=1600, MASTER_END=1400, MASTER_START=1200, RUNTIME=2000 unchanged.
- `api.service.ts`: `getDeployRuns` + `DeployRun`/`DeployEvent` types.
- New `components/DeployTab.tsx` with two views (antd Segmented toggle, persisted):
  - **Runs view**: list of deploy runs (date, projectId, namespace tag, commit message, tag version, status: error red / complete green / in-progress grey); selecting a run shows the vertical sequence MASTER_START → steps chips → MASTER_END → SLAVE_START → steps → SLAVE_END (errors red with eventData).
  - **Schema view**: static pipeline diagram (flow → serf: checkout/safe/branch configs → push → slave repo → slave action → hosting) built with plain divs + theme tokens; the selected run's taken branch and steps light up, untaken branches dimmed.
  - projectId filter (Select, like ListTab); `parcel build` + tsc clean.
- Register `deploy` tab in `LogsPage.tsx` after 'stat v2'.

## 4. know

- Update `entries/deploy-slave.md` telemetry section: new event set, payload fields, `WORKFLOW_RUN_ID` in slave `.env`, slave-side telemetry, removal of the old 4 events.

## 5. Verification

- stat: back `npm run typecheck`, web `parcel build`; start back locally and curl-simulate a full run (MASTER_START/END, SLAVE_START/END + an error case) → verify `/get-deploy-runs` grouping and the deploy tab in `parcel dev` (browser check).
- serf: careful review of YAML + heredoc escaping (no unintended `${{ }}`); no workflow can be tested locally — first real deploy validates it.
- Write plan/progress entries to `stat/DECISIONS.md` (before coding / after) per AGENTS.md. No commits unless asked.