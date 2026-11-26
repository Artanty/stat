// Logic test for fetchDeployRuns FLOW merge/provisional behavior (pool stubbed, no MySQL).
// Run: npx tsx test/deployRuns-flow.test.mjs
import { fetchDeployRuns } from '../core/deployRuns.ts';

// canned rows — newest-first, as ORDER BY id DESC would return
const rows = (list) => list.map((r, i) => ({ id: i + 1, isError: 0, workflow: null, commitMessage: null, steps: null, workflowRef: null, apiVersion: null, eventData: '', eventDate: '', ...r })).reverse();

let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`);
  if (!cond) failed++;
};

const ev = (over) => ({ projectId: 'tik@github', namespace: 'back', ...over });

// --- case 1: flow group merged into subsequent master run of same project+namespace
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '1.0.43.0.0.1', commit: 'trig' }), steps: '["webhook-received","signature-verified","tag-parsed","prev-tag-resolved","namespaces-resolved"]' }),
    ev({ stage: 'FLOW_END', eventData: JSON.stringify({ tag: '1.0.43.0.0.1' }), steps: '["webhook-received","signature-verified","tag-parsed","prev-tag-resolved","namespaces-resolved","safe-version","dispatch"]' }),
    ev({ stage: 'MASTER_START', workflowRunId: '111', eventData: '1.0.43.0.0.1', commitMessage: 'trig' }),
    ev({ stage: 'MASTER_END', workflowRunId: '111', eventData: '1.0.43.0.0.1' }),
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  check('case1: single merged run', runs.length === 1, JSON.stringify(runs.map(r => r.workflowRunId)));
  const r = runs[0];
  check('case1: not flowOnly', r.flowOnly === false);
  check('case1: stages has FLOW_START/FLOW_END', !!r.stages.FLOW_START && !!r.stages.FLOW_END, Object.keys(r.stages));
  check('case1: flow events precede master', r.events[0].stage === 'FLOW_START' && r.events[2].stage === 'MASTER_START', r.events.map(e => e.stage).join(','));
  check('case1: tag extracted from flow JSON', r.tag === '1.0.43.0.0.1', r.tag);
}

// --- case 2: flow group with NO subsequent run -> provisional flowOnly run
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '1.0.44.0.0.1' }), steps: '["webhook-received"]' }),
    ev({ stage: 'FLOW_ERROR', isError: 1, eventData: JSON.stringify({ tag: '1.0.44.0.0.1', error: 'safe api-version failed' }) }),
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  check('case2: one provisional run', runs.length === 1 && runs[0].flowOnly === true, JSON.stringify(runs));
  check('case2: workflowRunId is flow:<id>', runs[0].workflowRunId.startsWith('flow:'), runs[0].workflowRunId);
  check('case2: hasError', runs[0].hasError === true);
  check('case2: stages FLOW_ERROR present', !!runs[0].stages.FLOW_ERROR);
  check('case2: tag from JSON', runs[0].tag === '1.0.44.0.0.1', runs[0].tag);
}

// --- case 3: flow group for project A must NOT merge into project B's run
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '1' }) }),
    ev({ stage: 'FLOW_END', eventData: JSON.stringify({ tag: '1' }) }),
    { projectId: 'other@github', namespace: 'back', stage: 'MASTER_START', workflowRunId: '222', eventData: '1' },
    { projectId: 'other@github', namespace: 'back', stage: 'MASTER_END', workflowRunId: '222', eventData: '1' },
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  check('case3: two runs', runs.length === 2, String(runs.length));
  const flowRun = runs.find(r => r.flowOnly);
  const otherRun = runs.find(r => !r.flowOnly);
  check('case3: flow stayed provisional', !!flowRun && !!otherRun && !otherRun.stages.FLOW_START);
}

// --- case 4: flow group attaches to the EARLIEST subsequent run, not a later one
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '2' }) }),
    ev({ stage: 'FLOW_END', eventData: JSON.stringify({ tag: '2' }) }),
    ev({ stage: 'MASTER_START', workflowRunId: '301', eventData: '2' }),
    ev({ stage: 'MASTER_START', workflowRunId: '302', eventData: '3' }),
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  const r301 = runs.find(r => r.workflowRunId === '301');
  const r302 = runs.find(r => r.workflowRunId === '302');
  check('case4: merged into 301 not 302', !!r301?.stages.FLOW_START && !r302?.stages.FLOW_START);
}

// --- case 5: run of a different namespace not a merge target
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', namespace: 'back', eventData: JSON.stringify({ tag: '4' }) }),
    ev({ stage: 'FLOW_END', namespace: 'back', eventData: JSON.stringify({ tag: '4' }) }),
    ev({ stage: 'MASTER_START', namespace: 'web', workflowRunId: '401', eventData: '4' }),
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  check('case5: web run clean, flow provisional', runs.some(r => r.flowOnly) && !runs.some(r => r.workflowRunId === '401' && r.stages.FLOW_START));
}

// --- case 6: noy wake-and-callback recovery — FLOW_ERROR followed by a later
// FLOW_END (deferred dispatch landed) must not keep the run red
{
  const pool = { query: async () => [rows([
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '5' }) }),
    ev({ stage: 'FLOW_ERROR', isError: 1, eventData: JSON.stringify({ tag: '5', error: 'safe cold — deferred to noy' }) }),
    ev({ stage: 'FLOW_START', eventData: JSON.stringify({ tag: '5', deferred: true }), steps: '["deferred-resume"]' }),
    ev({ stage: 'FLOW_END', eventData: JSON.stringify({ tag: '5' }), steps: '["deferred-resume","safe-version","dispatch"]' }),
    ev({ stage: 'MASTER_START', workflowRunId: '501', eventData: '5' }),
    ev({ stage: 'MASTER_END', workflowRunId: '501', eventData: '5' }),
  ])] };
  const runs = await fetchDeployRuns(pool, {});
  const r = runs.find((x) => x.workflowRunId === '501');
  check('case6: one run, flow merged', runs.length === 1 && !!r, JSON.stringify(runs.map(x => x.workflowRunId)));
  check('case6: FLOW_ERROR cleared after later FLOW_END', !r.stages.FLOW_ERROR, Object.keys(r.stages));
  check('case6: hasError false', r.hasError === false);
  check('case6: FLOW_END kept', !!r.stages.FLOW_END);
}

process.exit(failed ? 1 : 0);
