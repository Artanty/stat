import type { DeployRunDto } from './deployRuns.js';

// DivKit envelope (schema v2: containers use `items`, never `children`) rendering the
// /mini widget's run-info + timeline blocks for the ext side-panel host — a port of
// web/src/deployTimeline.tsx logic, latest-run-only, no variables/actions (pure data).

// theme-aware via expressions on the ext host's global `theme` variable
// (theme-changer pattern: the card declares nothing, the global resolves first)
const tc = (dark: string, light: string): string => `@{theme == 'dark' ? '${dark}' : '${light}'}`;
const COLORS = {
  green: '#52C41A',
  red: '#FF4D4F',
  blue: '#1677FF',
  yellow: '#FAAD14',
  gray: tc('#9CA3AF', '#8C8C8C'),
  unlit: tc('#6B7280', '#B0B7C3'),
  text: tc('#D1D5DB', '#1F2937'),
  strong: tc('#F9FAFB', '#111827'),
  line: tc('#4B5563', '#D1D5DB'),
} as const;

const MASTER_CHIPS = ['start', 'checkout', 'tech-stack', 'safe', 'env-created', 'push'];
// flow (webhook service) step tags — mirrors web/src/deployTimeline.tsx FLOW_CHIPS
const FLOW_CHIPS = ['webhook-received', 'signature-verified', 'tag-parsed', 'prev-tag-resolved', 'namespaces-resolved', 'safe-version', 'dispatch'];
const BRANCH_CHIPS = ['vercel-json', 'render-yaml', 'ftp-workflow', 'vh-workflow', 'vds-workflow'];
const SLAVE_WORKFLOW_MARKS = ['ftp-workflow', 'vh-workflow', 'vds-workflow'];
const HOSTING_BY_BRANCH: Record<string, string> = {
  'vercel-json': 'vercel',
  'render-yaml': 'render',
  'ftp-workflow': 'ftp',
  'vh-workflow': 'timeweb vh',
  'vds-workflow': 'vds',
};

type RunStatus = 'error' | 'running' | 'master-done' | 'done';
const STATUS_META: Record<RunStatus, { color: string; label: string }> = {
  error: { color: COLORS.red, label: 'error' },
  running: { color: COLORS.gray, label: 'running' },
  'master-done': { color: COLORS.yellow, label: 'done' },
  done: { color: COLORS.green, label: 'done' },
};

const runStatus = (run: DeployRunDto): RunStatus => {
  if (run.stages.FLOW_ERROR || run.stages.MASTER_ERROR || run.stages.SLAVE_ERROR) return 'error';
  if (run.stages.SLAVE_END) return 'done';
  if (run.stages.MASTER_END) return 'master-done';
  return 'running';
};

// explicit dd.mm.yyyy formatting — Node's default locale would not match the browser's
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (s: string): string => {
  const d = new Date(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const fmtTime = (s?: string): string => {
  if (!s) return '';
  const d = new Date(s);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
// date shown once from start, then bare times — same as web's fmtRange
const fmtRange = (start: string, end: string): string => `${fmtDate(start)} → ${fmtTime(end)}`;

// loose DivKit div records — the renderer parses them, ext validates only the envelope shell
type Div = Record<string, unknown>;

const vContainer = (items: Div[], extra: Div = {}): Div => ({
  type: 'container',
  orientation: 'vertical',
  width: { type: 'match_parent' },
  ...extra,
  items,
});

const hContainer = (items: Div[], extra: Div = {}): Div => ({
  type: 'container',
  orientation: 'horizontal',
  width: { type: 'match_parent' },
  ...extra,
  items,
});

const text = (t: string, extra: Div = {}): Div => ({
  type: 'text',
  text: t,
  font_size: 12,
  text_color: COLORS.text,
  ...extra,
});

const title = (t: string, color: string, strong = false): Div =>
  text(t, { font_size: 13, text_color: color, ...(strong ? { font_weight: 'medium' } : {}) });

const timeText = (s?: string): Div =>
  text(fmtTime(s), { font_size: 10, text_color: COLORS.gray, width: { type: 'wrap_content' }, margins: { left: 8 } });

// timeline entry: colored dot + title (+ time on the same line), web Timeline analog
const timelineRow = (color: string, t: string, time?: string, extraItems: Div[] = []): Div[] => [
  hContainer(
    [
      text('●', { font_size: 10, text_color: color, width: { type: 'wrap_content' }, margins: { right: 6 } }),
      title(t, color, color === COLORS.red),
      ...(time ? [timeText(time)] : []),
    ],
    { margins: { top: 6 } }
  ),
  ...extraItems,
];

// full chip row: every possible step, lit if taken in this run (colors only — lit green, unlit gray)
const chipsRow = (steps: string[], chips: string[], top = 4): Div =>
  hContainer(
    chips.map((c) =>
      text(c, {
        font_size: 10,
        text_color: steps.includes(c) ? COLORS.green : COLORS.unlit,
        width: { type: 'wrap_content' },
        margins: { right: 8, top },
      })
    ),
    { margins: { left: 16, top: 2 } }
  );

const dashedLine = (): Div => ({
  type: 'separator',
  size: { width: { type: 'match_parent' }, height: { type: 'fixed', value: 1 } },
  color: COLORS.line,
  margins: { left: 16, top: 4 },
});

const masterSteps = (run: DeployRunDto): string[] => run.stages.MASTER_END?.steps ?? run.stages.MASTER_ERROR?.steps ?? [];
const slaveSteps = (run: DeployRunDto): string[] => run.stages.SLAVE_END?.steps ?? run.stages.SLAVE_ERROR?.steps ?? [];

const lastPassed = (steps: string[]): string => steps[steps.length - 1] || '—';

const flowSteps = (run: DeployRunDto): string[] =>
  run.stages.FLOW_END?.steps ?? run.stages.FLOW_ERROR?.steps ?? run.stages.FLOW_START?.steps ?? [];

const buildTimeline = (run: DeployRunDto): Div[] => {
  const items: Div[] = [];
  const mSteps = masterSteps(run);
  const sSteps = slaveSteps(run);

  // flow (webhook service) — FIRST in the timeline; a flow-only run (no master
  // start) means the serf action never started
  if (run.stages.FLOW_START) {
    const fSteps = flowSteps(run);
    items.push(...timelineRow(COLORS.blue, 'flow — webhook', run.stages.FLOW_START.eventDate));
    items.push(chipsRow(fSteps, FLOW_CHIPS));
    if (run.stages.FLOW_END) {
      items.push(...timelineRow(COLORS.blue, 'flow end — dispatched', run.stages.FLOW_END.eventDate));
    } else if (run.stages.FLOW_ERROR) {
      items.push(
        ...timelineRow(COLORS.red, 'flow error', run.stages.FLOW_ERROR.eventDate, [
          text(`last passed step: ${lastPassed(fSteps)}`, {
            font_size: 11,
            text_color: COLORS.gray,
            margins: { left: 16, top: 2 },
          }),
        ])
      );
    } else {
      items.push(...timelineRow(COLORS.gray, 'flow running…'));
    }
    if (!run.stages.MASTER_START) {
      items.push(...timelineRow(run.stages.FLOW_ERROR ? COLORS.red : COLORS.gray, 'github action not started'));
      return items;
    }
  }

  items.push(...timelineRow(COLORS.green, 'master start', run.stages.MASTER_START?.eventDate));
  items.push(chipsRow(mSteps, MASTER_CHIPS.filter((c) => c !== 'push')));
  items.push(dashedLine());
  items.push(chipsRow(mSteps, BRANCH_CHIPS, 2));
  items.push(chipsRow(mSteps, run.stages.MASTER_END ? ['push'] : [], 2));

  if (run.stages.MASTER_END) {
    items.push(...timelineRow(COLORS.green, 'master end — pushed to slave repo', run.stages.MASTER_END.eventDate));
  } else if (run.stages.MASTER_ERROR) {
    items.push(
      ...timelineRow(COLORS.red, 'master error', run.stages.MASTER_ERROR.eventDate, [
        text(`last passed step: ${lastPassed(mSteps)}`, {
          font_size: 11,
          text_color: COLORS.gray,
          margins: { left: 16, top: 2 },
        }),
      ])
    );
  } else {
    items.push(...timelineRow(COLORS.gray, 'master running…'));
  }

  const slaveActive = run.stages.SLAVE_START || run.stages.SLAVE_END || run.stages.SLAVE_ERROR;
  if (slaveActive) {
    items.push(...timelineRow(COLORS.blue, 'slave start', run.stages.SLAVE_START?.eventDate));
    const slaveChips = ['checkout', ...(sSteps.length ? sSteps : ['build', 'deploy']).filter((c) => c !== 'checkout')];
    items.push(chipsRow(sSteps, slaveChips, 2));
    if (run.stages.SLAVE_END) {
      items.push(...timelineRow(COLORS.green, 'slave end — deployed', run.stages.SLAVE_END.eventDate));
    } else if (run.stages.SLAVE_ERROR) {
      items.push(
        ...timelineRow(COLORS.red, 'slave error', run.stages.SLAVE_ERROR.eventDate, [
          text(`last passed step: ${lastPassed(sSteps)}`, {
            font_size: 11,
            text_color: COLORS.gray,
            margins: { left: 16, top: 2 },
          }),
        ])
      );
    } else {
      items.push(...timelineRow(COLORS.gray, 'slave running…'));
    }
  } else if (run.stages.MASTER_END) {
    items.push(...timelineRow(COLORS.gray, 'no slave workflow — platform deploys on push'));
  }

  const hosting = HOSTING_BY_BRANCH[BRANCH_CHIPS.find((c) => mSteps.includes(c)) ?? ''];
  const slaveWorkflowGenerated = SLAVE_WORKFLOW_MARKS.some((m) => mSteps.includes(m));
  if (hosting) {
    const failed = !!run.stages.MASTER_ERROR || !!run.stages.SLAVE_ERROR;
    const live = !!run.stages.SLAVE_END || (!!run.stages.MASTER_END && !slaveWorkflowGenerated);
    items.push(
      ...timelineRow(failed ? COLORS.red : live ? COLORS.green : COLORS.gray, `hosting: ${hosting}`)
    );
  }

  return items;
};

const emptyCard = (message: string): Div =>
  vContainer([text(message, { font_size: 13, text_color: COLORS.gray })], { paddings: { top: 8, bottom: 8, left: 8, right: 8 } });

// latest-run-only analog of web/src/components/MiniPage.tsx (no selector / last / reload)
export function buildMiniEnvelope(run: DeployRunDto | null): Record<string, unknown> {
  let root: Div;
  if (!run) {
    root = emptyCard('no runs');
  } else {
    const status = STATUS_META[runStatus(run)];
    root = vContainer(
      [
        // run-info block
        vContainer(
          [
        // [status icon] projectName | namespace | version — 3 parts, status label lives in the icon color
        hContainer([
          text(
            { done: '✓', 'master-done': '✓', error: '✕', running: '●' }[runStatus(run)],
            { font_size: 12, text_color: status.color, width: { type: 'wrap_content' }, margins: { right: 6 } }
          ),
          text(run.projectId, { font_size: 13, text_color: COLORS.strong, font_weight: 'medium' }),
          text(run.namespace, { font_size: 11, text_color: COLORS.gray, margins: { left: 8 } }),
          ...(run.tag
            ? [text(`v${run.tag}`, { font_size: 11, text_color: COLORS.blue, margins: { left: 8 } })]
            : []),
          ...(run.retriggered
            ? [text('↻ retriggered', { font_size: 11, text_color: COLORS.yellow, margins: { left: 8 } })]
            : []),
        ]),
            text(run.commitMessage || '—', { margins: { top: 4 } }),
            text(fmtRange(run.startDate, run.endDate), {
              font_size: 11,
              text_color: COLORS.gray,
              margins: { top: 2 },
            }),
            ...(run.retriggeredAt
              ? [text(`retriggered ${run.retriggeredAt}`, { font_size: 11, text_color: COLORS.gray, margins: { top: 2 } })]
              : []),
          ],
          { margins: { top: 4 } }
        ),
        // timeline block
        vContainer(buildTimeline(run), { margins: { top: 8 } }),
      ],
      { paddings: { top: 8, bottom: 8, left: 8, right: 8 } }
    );
  }

  return {
    envelopeVersion: 1,
    remoteId: 'stat-mini',
    name: 'Stat',
    netAllowlist: [],
    card: {
      log_id: 'stat-mini',
      states: [{ state_id: 0, div: root }],
    },
  };
}
