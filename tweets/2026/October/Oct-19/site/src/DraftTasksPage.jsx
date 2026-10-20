/* /draft/tasks/ — one card per RoboDojo-RC Tier 1 task (user 2026-10-18):
   Dream-1 against Opus 5.5, Gemini 4 Argon and GPT-6 Astra, leaderboard-style
   bars (mean score) with every trial drawn as a dot. Same 4:5 frame as /draft/.

   Per-trial scores: src/dream1TaskScores.json, built from
   - Dream-1: omen workbench set 65d2b81265f0 (2026-10-18), gpt-6-astra autograde;
   - Gemini 4 Argon: data/all-runs.json, leaderboard "gemini-4-argon" (Final Runs rule);
   - Opus 5.5 (xhigh, fast) and GPT-6 Astra (high, ultrafast): data-analysis
     robodojo-milestone-mix.json level counts ("Sort Objects" = Classify Objects).
   The six task means reproduce the leaderboard card (60.9 / 48.3 / 48.2 / 47.1). */

import { Panel } from './Trends.jsx';
import { useChartSize } from './useChartSize.js';
import { COLOR } from './LeaderboardBars.jsx';
import { LogoMarker } from './robodojoModels.jsx';
import { DRAFT_CSS, DRAFT_W, footer } from './DraftPage.jsx';
import DATA from './dream1TaskScores.json';

const MODELS = [
  { name: 'Dream-1', lab: 'dreamlabs' },
  { name: 'Opus 5.5', lab: 'anthropic' },
  { name: 'Gemini 4 Argon', lab: 'google' },
  { name: 'GPT-6 Astra', lab: 'openai' },
];
const LINES = { 'Dream-1': ['Dream-1'], 'Opus 5.5': ['Opus 5.5'], 'Gemini 4 Argon': ['Gemini 4', 'Argon'], 'GPT-6 Astra': ['GPT-6', 'Astra'] };
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

function TaskDots({ task, hero = false }) {
  const [ref, W, H] = useChartSize(380, 320);
  const M = hero ? { top: 14, right: 8, bottom: 96, left: 38 } : { top: 22, right: 8, bottom: 74, left: 38 };
  const band = (W - M.left - M.right) / MODELS.length;
  const BAR = Math.min(band * 0.6, 64);
  const y = (s) => M.top + (1 - s) * (H - M.top - M.bottom);
  const R = 3.1, STEP = 7; // dot radius and horizontal spacing within a score level
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} role="img"
        aria-label={`${task}: ${MODELS.map((m) => `${m.name} mean ${Math.round(mean(DATA.scores[task][m.name]) * 100)}%`).join(', ')}; dots are individual trials.`}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" strokeDasharray="2 3" />
            <text x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="rc-chart-tick">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {MODELS.map((m, i) => {
          const v = DATA.scores[task][m.name], mu = mean(v);
          const cx = M.left + band * (i + 0.5), base = y(0), top = y(mu);
          // Per score level, dots pack into
          // rows of at most PER_ROW, centred on the level line.
          const PER_ROW = Math.max(1, Math.floor(((hero ? BAR + 6 : band - 10)) / STEP)); // hero: rows stay inside the bar; else full column width
          // Scores within 0.035 are one rubric level recorded with different rounding (0.66/0.67, 0.83/0.85).
          const levels = {};
          [...v].sort((a, b) => a - b).forEach((s) => {
            const k = Object.keys(levels).find((l) => Math.abs(Number(l) - s) < 0.035) ?? String(s);
            levels[k] = (levels[k] || 0) + 1;
          });
          const dots = Object.entries(levels).flatMap(([s, n]) => Array.from({ length: n }, (_, k) => {
            const row = Math.floor(k / PER_ROW), inRow = Math.min(PER_ROW, n - row * PER_ROW), col = k % PER_ROW;
            const rows = Math.ceil(n / PER_ROW);
            return { x: cx + (col - (inRow - 1) / 2) * STEP, y: y(Number(s)) + (row - (rows - 1) / 2) * STEP }; // extra rows centre on the level
          }));
          const lead = m.name === 'Dream-1';
          const ink = hero && !lead ? '#8A847C' : COLOR[m.lab]; // hero: LLMs in warm grey so Dream-1 carries the colour
          return (
            <g key={m.name}>
              <path d={`M${cx - BAR / 2},${base}V${top + 5}a5,5 0 0 1 5,-5H${cx + BAR / 2 - 5}a5,5 0 0 1 5,5V${base}Z`} fill={ink} opacity={hero ? (lead ? 0.32 : 0.16) : 0.28} />
              <line x1={cx - BAR / 2} x2={cx + BAR / 2} y1={top} y2={top} stroke={ink} strokeWidth={2.5} />
              {dots.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={R} fill={ink} stroke="#fff" strokeWidth={0.9} />)}
              {!hero && <text x={cx + BAR / 2 + 3} y={top} textAnchor="start" dominantBaseline="middle" className="rc-lbars-val rc-lbars-val-out"
                style={{ paintOrder: 'stroke', stroke: 'var(--surface-page, #FBFAF6)', strokeWidth: 4, ...(lead ? { fontWeight: 700 } : {}) }}>{Math.round(mu * 100)}</text>}
              {hero && <text x={cx} y={base + 84} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, fill: lead ? '#A8560F' : '#5F5A53' }}>{Math.round(mu * 100)}%</text>}
              <LogoMarker lab={m.lab} cx={cx} cy={base + 18} />
              <text x={cx} y={base + 46} textAnchor="middle" className="rc-lbars-name">
                {LINES[m.name].map((part, k) => <tspan key={k} x={cx} dy={k ? 13 : 0}>{part}</tspan>)}
              </text>
            </g>
          );
        })}
        <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} className="rc-chart-axis" />
      </svg>
    </div>
  );
}

export const TASK_PANELS = DATA.tasks.map((task) => ({
  id: `d1-task-${task.toLowerCase().replace(/\s+/g, '-')}`,
  title: task,
  body: 'Score per trial (dots) and mean score (bar), 20 real-world trials per model',
  chart: () => <TaskDots task={task} />,
}));

// OWID-style horizontal strip (user 2026-10-18), after OWID Grapher's DiscreteBarChart and
// ScatterPoints: one row per model, hairline (~0.3 px, half-opacity) point borders, bold entity label left, value label (regular weight) right
// of the bar end, points at ~0.75 opacity with a thin darker stroke so overlaps stay visible,
// emphasis by opacity (non-focus rows muted), gridlines in GRAY_20 (#e7e7e7), axis labels in GRAY_70.
const OWID = { grid: '#e7e7e7', tick: '#767676', text: '#2d2e2d', muted: 0.4 };
function TaskStripOwid({ task, focus = 'Dream-1' }) {
  // Strip plot (user 2026-10-18, option 1): every trial a small dot with seeded vertical jitter,
  // the mean as a bold tick and its 95% bootstrap CI as a line through it. No bar. LLM rows in
  // solid warm grey (not faded) so the comparison reads as fair.
  const [ref, W, H] = useChartSize(380, 360);
  const M = { top: 8, right: 16, bottom: 44, left: 150 };
  const rowH = (H - M.top - M.bottom) / MODELS.length;
  const x = (s) => M.left + s * (W - M.left - M.right);
  const R = 2.6;
  const rows = MODELS.map((m) => ({ ...m, v: DATA.scores[task][m.name] })).map((m) => ({ ...m, mu: mean(m.v) }))
    .sort((a, b) => b.mu - a.mu);
  // Deterministic jitter (mulberry32), so screenshots are reproducible.
  const rand = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} role="img"
        aria-label={`${task}: ${rows.map((r) => `${r.name} mean ${Math.round(r.mu * 100)}%`).join(', ')}; dots are individual trials.`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.top} y2={H - M.bottom} stroke={OWID.grid} strokeWidth={1} />
            <text x={x(t)} y={H - M.bottom + 18} textAnchor="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fill: OWID.tick }}>{Math.round(t * 100)}%</text>
          </g>
        ))}
        <text x={0} y={H - 4} textAnchor="start" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fill: OWID.tick }}>n = 20 trials per model</text>
        {rows.map((r, i) => {
          const cy = M.top + rowH * (i + 0.5), on = r.name === focus;
          const ink = on ? COLOR[r.lab] : '#9A948C';
          const rnd = rand(1000 + i * 97), spread = rowH * 0.3;
          const dots = r.v.map((s) => ({ x: Math.max(x(s), x(0) + R), y: cy + (rnd() * 2 - 1) * spread }));
          const [lo, hi] = DATA.ci95[task][r.name];
          return (
            <g key={r.name}>
              {dots.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={R} fill={ink} fillOpacity={0.7} stroke="#333" strokeWidth={0.3} strokeOpacity={0.4} />)}
              {/* 95% CI line and mean tick */}
              <line x1={x(lo)} x2={x(hi)} y1={cy} y2={cy} stroke={on ? '#7A3E0B' : '#4E4A45'} strokeWidth={2} strokeLinecap="round" />
              <line x1={x(r.mu)} x2={x(r.mu)} y1={cy - 9} y2={cy + 9} stroke={on ? '#7A3E0B' : '#4E4A45'} strokeWidth={3} strokeLinecap="round" />
              <LogoMarker lab={r.lab} cx={14} cy={cy} />
              <text x={32} y={cy} dominantBaseline="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, fill: on ? '#A8560F' : OWID.text }}>{r.name}</text>
            </g>
          );
        })}
        <line x1={x(0)} x2={x(0)} y1={M.top} y2={H - M.bottom} stroke={OWID.tick} strokeWidth={1} />
      </svg>
    </div>
  );
}
// Option 2 (user 2026-10-18): one 100% bar per model, split by outcome bucket (share of 20 trials).
const BOTTLE_BUCKETS = [
  { label: 'Nothing', test: (s) => s < 0.05 },
  { label: 'Lifted a bottle', test: (s) => s < 0.2 },
  { label: '1 standing', test: (s) => s < 0.65 },
  { label: '2 standing', test: (s) => s < 0.95 },
  { label: 'All 3 standing', test: () => true },
];
// Failure → success (user 2026-10-18, palette Grey-fail): failures in warm grey, only progress in colour.
// Old (5-level) rubric for every model: no 'tilted' level (user 2026-10-18).
const BUCKET_INK = ['#B8B2A8', '#D6D0C6', '#B5D68B', '#6AAE6A', '#2F7D4A'];
const BUCKET_TEXT = ['#2d2e2d', '#2d2e2d', '#2d2e2d', '#2d2e2d', '#fff'];
function TaskOutcomeBars({ task }) {
  const [ref, W, H] = useChartSize(380, 360);
  const M = { top: 4, right: 16, bottom: 92, left: 150 };
  const rowH = (H - M.top - M.bottom) / MODELS.length;
  const x = (f) => M.left + f * (W - M.left - M.right);
  const rows = MODELS.map((m) => ({ ...m, v: DATA.scores[task][m.name] })).map((m) => ({ ...m, mu: mean(m.v) })).sort((a, b) => b.mu - a.mu);
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} role="img" aria-label={`${task}: share of 20 trials by outcome per model.`}>
        {rows.map((r, i) => {
          const cy = M.top + rowH * (i + 0.5), bh = Math.min(rowH * 0.56, 34);
          const counts = BOTTLE_BUCKETS.map(() => 0);
          r.v.forEach((s) => { counts[BOTTLE_BUCKETS.findIndex((b) => b.test(s))] += 1; });
          let acc = 0;
          return (
            <g key={r.name}>
              {counts.map((c, k) => { const x0 = x(acc / r.v.length); acc += c; const w = x(acc / r.v.length) - x0; return c ? (
                <g key={k}>
                  <rect x={x0} y={cy - bh / 2} width={w} height={bh} fill={BUCKET_INK[k]} stroke="#FBFAF6" strokeWidth={1} />
                  {w > 16 && <text x={x0 + w / 2} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, fill: BUCKET_TEXT[k] }}>{c}</text>}
                </g>) : null; })}
              <LogoMarker lab={r.lab} cx={14} cy={cy} />
              <text x={32} y={cy} dominantBaseline="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, fill: r.name === 'Dream-1' ? '#A8560F' : OWID.text }}>{r.name}</text>
            </g>
          );
        })}
        {/* legend: two rows of swatches under the bars */}
        {BOTTLE_BUCKETS.map((b, k) => { const col = k % 3, row = Math.floor(k / 3), lx = col * 132, ly = H - M.bottom + 26 + row * 22; return (
          <g key={b.label}><rect x={lx} y={ly - 7} width={14} height={14} fill={BUCKET_INK[k]} /><text x={lx + 20} y={ly} dominantBaseline="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fill: OWID.text }}>{b.label}</text></g>); })}
        <text x={0} y={H - 4} textAnchor="start" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fill: OWID.tick }}>Number of trials out of 20</text>
      </svg>
    </div>
  );
}
export const BOTTLES_OUTCOMES = {
  id: 'd1-bottles-outcomes',
  title: <><span style={{ color: '#A8560F' }}>Dream-1</span> is the first model to complete “Stand Up Bottles”, a difficult robotics task that frontier LLMs struggle with.</>,
  body: null,
  chart: () => <TaskOutcomeBars task="Stand Up Bottles" />,
};
// Option 3 (user 2026-10-18): unit chart, one square per trial (2 rows of 10), coloured by outcome,
// best trials first. Same buckets and legend as the outcome bars.
function TaskUnitChart({ task, ink = BUCKET_INK }) {
  const [ref, W, H] = useChartSize(380, 360);
  const M = { top: 4, right: 16, bottom: 92, left: 150 };
  const rowH = (H - M.top - M.bottom) / MODELS.length;
  const rows = MODELS.map((m) => ({ ...m, v: DATA.scores[task][m.name] })).map((m) => ({ ...m, mu: mean(m.v) })).sort((a, b) => b.mu - a.mu);
  const PER = 10, GAP = 3, SZ = Math.min((W - M.left - M.right - GAP * (PER - 1)) / PER, (rowH - 10) / 2 - GAP);
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }} role="img" aria-label={`${task}: each of 20 trials per model as a square coloured by outcome.`}>
        {rows.map((r, i) => {
          const cy = M.top + rowH * (i + 0.5);
          const cells = [...r.v].sort((a, b) => b - a).map((s) => BOTTLE_BUCKETS.findIndex((b) => b.test(s)));
          return (
            <g key={r.name}>
              {cells.map((k, j) => { const col = j % PER, row = Math.floor(j / PER); return (
                <rect key={j} x={M.left + col * (SZ + GAP)} y={cy - SZ - GAP / 2 + row * (SZ + GAP)} width={SZ} height={SZ} rx={2} fill={ink[k]} />); })}
              <LogoMarker lab={r.lab} cx={14} cy={cy} />
              <text x={32} y={cy} dominantBaseline="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, fill: r.name === 'Dream-1' ? '#A8560F' : OWID.text }}>{r.name}</text>
            </g>
          );
        })}
        {BOTTLE_BUCKETS.map((b, k) => { const col = k % 3, row = Math.floor(k / 3), lx = col * 132, ly = H - M.bottom + 26 + row * 22; return (
          <g key={b.label}><rect x={lx} y={ly - 7} width={14} height={14} rx={2} fill={ink[k]} /><text x={lx + 20} y={ly} dominantBaseline="middle" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fill: OWID.text }}>{b.label}</text></g>); })}
        <text x={0} y={H - 4} textAnchor="start" style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fill: OWID.tick }}>Each square is one real-world trial</text>
      </svg>
    </div>
  );
}
export const BOTTLES_UNITS = {
  id: 'd1-bottles-units',
  title: <><span style={{ color: '#A8560F' }}>Dream-1</span> is the first model to complete “Stand Up Bottles”, a difficult robotics task that frontier LLMs struggle with.</>,
  body: null,
  chart: () => <TaskUnitChart task="Stand Up Bottles" />,
};
// Palette candidates for the unit chart (user 2026-10-18: "make a bunch, I'll choose").
export const PALETTES = {
  C: ['#CA3A3A', '#E9883F', '#F1C75B', '#B5D68B', '#6AAE6A', '#2F7D4A'],
  'C-bright': ['#D93A3A', '#F08A3A', '#F5C842', '#A8D672', '#4FAF5A', '#1F7A40'],
  'C-deep': ['#B42E2E', '#D9772E', '#E8B840', '#9CC36E', '#4E9A57', '#1D5F3A'],
  Tableau: ['#C0392B', '#E67E22', '#F4D03F', '#A9CF54', '#58B368', '#1E8449'],
  'RdYlGn': ['#D73027', '#FC8D59', '#FEE08B', '#D9EF8B', '#91CF60', '#1A9850'],
  'Two-hue': ['#D64545', '#EE9A9A', '#E9E4DA', '#A9D8B0', '#55B36A', '#1F7A3E'],
  'Sunset-teal': ['#D1495B', '#EDAE49', '#F4E3B1', '#9FD8CB', '#2FA4A9', '#00798C'],
  'Grey-fail': ['#B8B2A8', '#D6D0C6', '#F1C75B', '#B5D68B', '#6AAE6A', '#2F7D4A'],
};
export const PALETTE_PANELS = Object.entries(PALETTES).map(([name, ink]) => ({
  id: `d1-units-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  title: <>Palette: {name}</>,
  body: null,
  chart: () => <TaskUnitChart task="Stand Up Bottles" ink={ink} />,
}));
const GRAPHER_STROKE = (lab) => (lab === 'openai' ? '#000' : '#333');
export const BOTTLES_OWID = {
  id: 'd1-bottles-owid',
  title: <><span style={{ color: '#A8560F' }}>Dream-1</span> is the first model to complete “Stand Up Bottles”, a difficult robotics task that frontier LLMs struggle with.</>,
  body: 'Stand Up Bottles: score of each real-world trial (dots), mean and 95% CI (line)',
  chart: () => <TaskStripOwid task="Stand Up Bottles" />,
};

const D1 = () => <span style={{ color: '#A8560F' }}>Dream-1</span>;
export const BOTTLES_HERO = {
  id: 'd1-bottles-hero',
  title: <><D1 /> stands up bottles 7× better than the best LLMs</>,
  body: 'Stand Up Bottles: mean score and each of 20 real-world trials (dots)',
  chart: () => <TaskDots task="Stand Up Bottles" hero />,
};

export function DraftTasksPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', padding: 24, background: 'var(--surface-page)' }}>
      <h1 className="rc-sr-only">Draft media: Dream-1 per-task scores</h1>
      <style>{DRAFT_CSS}</style>
      {/* Unit chart first (user 2026-10-18). */}
      <div className="rc-trends rc-draft rc-draft-hero" style={{ width: DRAFT_W }}>
        <Panel panel={BOTTLES_UNITS} index={0} active footer={footer} />
      </div>
      <div className="rc-trends rc-draft rc-draft-hero" style={{ width: DRAFT_W }}>
        <Panel panel={BOTTLES_OWID} index={0} active footer={footer} />
      </div>
      <div className="rc-trends rc-draft rc-draft-hero" style={{ width: DRAFT_W }}>
        <Panel panel={BOTTLES_OUTCOMES} index={0} active footer={footer} />
      </div>
      <div className="rc-trends rc-draft rc-draft-hero" style={{ width: DRAFT_W }}>
        <Panel panel={BOTTLES_HERO} index={0} active footer={footer} />
      </div>
      {PALETTE_PANELS.map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft rc-draft-hero" style={{ width: DRAFT_W }}>
          <Panel panel={p} index={i} active footer={footer} />
        </div>
      ))}
      {TASK_PANELS.map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft rc-draft-task" style={{ width: DRAFT_W }}>
          <Panel panel={p} index={i} active footer={footer} />
        </div>
      ))}
    </main>
  );
}
