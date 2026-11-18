Date-display cleanup across web (full deploy tab + /mini) and the SDUI envelope. Per your call: the header row always shows the date once + start time → end time, regardless of whether the run crosses midnight — never a second full date.

## web (`web/src/deployTimeline.tsx` + consumers)

1. Add next to `fmtDate`:
   - `fmtTime = (s) => new Date(s).toLocaleTimeString()` — time-only.
   - `fmtRange = (start, end)` — always `` `${fmtDate(start)} → ${fmtTime(end)}` `` (date once from start, then bare times).
2. Timeline stage label in `buildTimelineItems`'s `push()` (deployTimeline.tsx:67): `fmtDate(time)` → `fmtTime(time)`.
3. `MiniPage.tsx:131` and `DeployTab.tsx:319` run header: use `fmtRange(run.startDate, run.endDate)`. DeployTab.tsx:294 run-list rows keep `fmtDate` (single date there).

## SDUI (`back/core/miniEnvelope.ts`)

4. Replace ISO `fmtDate` with explicit `dd.mm.yyyy, hh:mm:ss` formatting (Node locale ≠ browser locale); add matching `fmtTime` (`hh:mm:ss`); `fmtRange` = date once + `start → end-time`, same as web.
5. `timeText()` (stage times) uses `fmtTime`; header row uses `fmtRange`.

## Verify

6. Web: tsc + eyeball /mini and deploy tab on the dev server.
7. Back: curl `/mini/envelope.json` on :3230 — header shows one date + two times, stages show bare times.
8. Progress entry in `stat/DECISIONS.md`. No commits/deploys.