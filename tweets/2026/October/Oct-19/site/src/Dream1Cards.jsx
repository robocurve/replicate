/* /draft/ — Dream-1 X cards (user 2026-10-18): leaderboard, score vs
   cost, score vs time, score by release date. Same components and frame as
   the Gemini 4 Argon cards (Gemini4Cards.jsx).

   Dream-1 (dreamlabs/dream-1-beta, Dreamlabs-hosted inference): omen
   workbench set "Oct 18 — Dream-1 capabilities — 180s" (65d2b81265f0),
   120 included runs (20 per task), gpt-6-astra autograde, no human
   relabels. Mean of task means 59.25% under the old (5-level) Stand Up Bottles rubric, 60.875% under the new one; 30/120 fully complete; 3.007 min
   per attempt (every trial runs to the 180 s cap). Cost: $3/h (user
   2026-10-18) × 3.007 min = $0.150 per attempt. Release 2026-10-19 (user). Marker: Dream Labs' X avatar.
   Keys and grades: ~/robocurve/dream1-plots/data/.
   GR00T N1.7 and MolmoAct2: origin/main robocurve-leaderboard.json
   (2026-10-18; cost = RTX 5090 rental, cost_usd / 6 per attempt). */

import { BarCard } from './LeaderboardBars.jsx';
import { ParetoChart } from './ParetoChart.jsx';
import { LogoReleaseChart } from './Trends.jsx';
import { MODELS, LABEL_INK } from './robodojoModels.jsx';

const D1 = () => <span style={{ color: LABEL_INK.dreamlabs }}>Dream-1</span>;
const BENCH = 'RoboDojo-RC Tier 1, a real-world bimanual benchmark';

const DREAM = { vla: true, name: 'Dream-1', lab: 'dreamlabs', score: 0.5925, cost: 0.1503, mins: 3.007, released: '2026-10-19', n: 120, mode: 'standard', success: 30 / 120 };
const VLAS = [
  DREAM,
  { vla: true, name: 'MolmoAct2', lab: 'ai2', score: 0.189, cost: 0.39396 / 6, mins: 3.311, released: '2026-05-04', n: 120, mode: 'standard' },
  { vla: true, name: 'GR00T N1.7', lab: 'nvidia', score: 0.0951, cost: 0.30487 / 6, mins: 2.562, released: '2026-04-17', n: 120, mode: 'standard' },
];
// LLM configs only in Chris's data-analysis table (as on the Gemini 4 cards).
const LLM_EXTRA = [
  { name: 'GPT-6 Astra (xhigh)', lab: 'openai', score: 0.4519, cost: 4.067, mins: 4.792, released: '2026-09-04', n: 120, mode: 'fast' },
  { name: 'Opus 5.5 (xhigh)', lab: 'anthropic', score: 0.4827, cost: 4.959, mins: 5.331, released: '2026-09-22', n: 120, mode: 'fast' },
  { name: 'GPT-6 Astra (high, ultrafast)', lab: 'openai', score: 0.4708, cost: 10.111, mins: 2.474, released: '2026-09-04', n: 120, mode: 'standard' },
];
const ALL = [...MODELS, ...LLM_EXTRA, ...VLAS];
// Time card (user 2026-10-18): Dream-1 at its mean time to reach its final score, not the
// 180 s trial cap. Same judge (gpt-6-astra high) asked for the earliest video time at which
// the saved score was already earned, 166 evenly spaced frames per camera
// (omen:~/scratch/dream1-time/). Mean over all 118 scored trials: 86.8 s (median 74 s).
const DREAM_DONE_MIN = 86.84 / 60;
// VLAs all on the same measure (user 2026-10-18): mean time to reach the final score over
// scored trials, same judge and method (omen:~/scratch/vla-time/, 2026-10-18; 120 s trials):
// GR00T N1.7 55.2 s (48 scored trials), MolmoAct2 50.0 s (77). LLMs stay at wall-clock per attempt.
const VLA_DONE_MIN = { 'Dream-1': DREAM_DONE_MIN, 'GR00T N1.7': 55.2 / 60, MolmoAct2: 50.0 / 60 };
const ALL_TIME = ALL.map((m) => (VLA_DONE_MIN[m.name] ? { ...m, mins: VLA_DONE_MIN[m.name] } : m));

// Leaderboard: each model once, at its best-scoring config; no effort labels (user 2026-10-18).
const ROWS = [
  { model: 'Dream-1', value: 59.25, lab: 'dreamlabs', effort: '' },
  { model: 'Opus 5.5', value: 48.27, lab: 'anthropic', effort: '' },
  { model: 'Gemini 4 Argon', value: 48.23, lab: 'google', effort: '' },
  { model: 'GPT-6 Astra', value: 47.08, lab: 'openai', effort: '' },
  { model: 'GPT-6.1 Sol', value: 41.69, lab: 'openai', effort: '' },
  { model: 'Gemini 3.8 Flash', value: 36.24, lab: 'google', effort: '' },
  { model: 'Molmo Act2', value: 18.9, lab: 'ai2', effort: '' },
  { model: 'GR00T N1.7', value: 9.51, lab: 'nvidia', effort: '' },
];
// Portrait leaderboard name lines: ≤ 7 characters per line so neighbours never touch.
const LB_NAMES = { 'Dream-1': ['Dream-1'], 'Opus 5.5': ['Opus', '5.5'], 'Gemini 4 Argon': ['Gemini', '4 Argon'], 'GPT-6 Astra': ['GPT-6', 'Astra'],
  'GPT-6.1 Sol': ['GPT-6.1', 'Sol'], 'Gemini 3.8 Flash': ['Gemini', '3.8', 'Flash'], 'Molmo Act2': ['Molmo', 'Act2'], 'GR00T N1.7': ['GR00T', 'N1.7'] };
const Bars = () => (
  <BarCard bg="none" rows={ROWS} ymax={80} grid={[20, 40, 60, 80]} nameLines={(r) => LB_NAMES[r.model]} minBottom={60}
    aria={`Mean score per attempt: ${ROWS.map((r) => `${r.model} ${Math.round(r.value)}`).join(', ')}.`}
    tip={(r) => (<><strong>{r.model}{r.effort ? ` (${r.effort})` : ''}</strong><span>{Math.round(r.value)} avg score · 120 trials</span></>)} />
);

const NEW_CFG = new Set(['Dream-1']);
const config = (m) => (m.mode && m.mode !== 'standard' ? m.name.replace(/\)$/, `, ${m.mode})`) : m.name);
const DREAM_INK = { 'Dream-1': LABEL_INK.dreamlabs };

const COST_LABELS = new Set(['Dream-1', 'Gemini 4 Argon (high)', 'Opus 5.5 (xhigh)', 'GPT-6 Astra (high, ultrafast)', 'MolmoAct2', 'GR00T N1.7']);
// Only Dream-1 shows its cost; the rest are named only (user 2026-10-18).
const costLabel = (m) => (m.name === 'Dream-1' ? `Dream-1 · $${m.cost.toFixed(2)}` : m.name.replace(/ \(.*\)$/, ''));
const TIME_LABELS = new Set(['Dream-1', 'Gemini 4 Argon (high)', 'Opus 5.5 (xhigh)', 'GPT-6 Astra (high, ultrafast)']);
// Only Dream-1 shows its time; the rest are named only (user 2026-10-18).
const timeLabel = (m) => (m.name === 'Dream-1' ? `Dream-1 · ${m.mins.toFixed(1)} min` : m.name.replace(/ \(.*\)$/, ''));

const RELEASE_PLACE = {
  'Dream-1': { dx: -14, dy: -4, anchor: 'end' },
  'Gemini 4 Argon (high)': { dx: -14, dy: -10, anchor: 'end' },
  'GPT-6 Astra (high)': { dx: -12, dy: -10, anchor: 'end' },
  'Gemini 3.8 Flash (high)': { dx: -16, dy: 5, anchor: 'end' },
  MolmoAct2: { dx: -10, dy: -14, anchor: 'start' },
  'GR00T N1.7': { dx: 32, dy: 5, anchor: 'start' },
};
const day = (iso) => Date.parse(`${iso}T00:00:00Z`);
const REL_TICKS = [['2026-04-01', 'Apr'], ['2026-06-01', 'Jun'], ['2026-08-01', 'Aug'], ['2026-10-01', 'Oct']];

const base = (m) => m.name.replace(/ \(.*\)$/, '');
const costLabelShort = costLabel;
const timeLabelShort = timeLabel;
// Arrow multiples (old rubric, Dream-1 59.25): cost arrow vs Gemini 4 Argon 59.25/48.23 = 1.23x; speed arrow vs GPT-6 Astra ultrafast 59.25/47.08 = 1.26x.
// Earlier (user 2026-10-18), vs every LLM: better = 60.9 / 48.3 (Opus 5.5 xhigh, best LLM);
// cost card arrow is from Gemini 4 Argon (high): 60.9 / 48.2 = 1.26x better, $2.342 / $0.150 = 15.6x (16x) cheaper; faster = 2.47 min (GPT-6 Astra ultrafast, fastest LLM) / 1.45 min.
// LLM labels hidden on the log cards (user 2026-10-18). To restore them, set
// SHOW_LLM_LABELS = true: their positions and leader lines stay in each card's inlinePlace.
const SHOW_LLM_LABELS = false;
const VLA_ONLY = new Set(['Dream-1', 'MolmoAct2', 'GR00T N1.7']);
const logLabels = (full) => (SHOW_LLM_LABELS ? full : new Set([...full].filter((n) => VLA_ONLY.has(n))));
const fmtUsd = (v) => (v < 1 ? `$${v.toFixed(2)}` : `$${v}`);
// Log-x variants (user 2026-10-18), shown below the linear cards for comparison.
export const D1_LOG_PANELS = [
  { id: 'd1-cost-log', title: <><D1 /> beats every LLM in robotics while being cheaper than all of them</>, body: 'Mean score vs. estimated cost per task attempt',
    chart: () => <ParetoChart metric="cost" models={ALL} labelAll labelOnly={new Set([...logLabels(COST_LABELS), 'Gemini 4 Argon (high)'])} label={costLabelShort} logX={[0.03, 30]} xTicks={[0.03, 0.1, 0.3, 1, 3, 10, 30]} tickFmt={fmtUsd}
      yMax={1} yTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]} legend={false} frontierLabelAt={{ x: 6, s: 0.645 }} oldExclude={NEW_CFG} arrowAt="diag45" arrowFrom="Gemini 4 Argon (high)" arrowTo="Dream-1" arrowLabel="1.2× better, 16× cheaper" oldLabelAt={{ x: 1.3, dy: 24, anchor: 'start' }}
      arrowLabelPos={[26, 16, 'end']} inlinePlace={{ 'Dream-1': [12, -14, 'start'], 'Gemini 4 Argon (high)': [26, -19, 'start', true, 'curve'], 'Opus 5.5 (xhigh)': [14, 44, 'start', true],
        MolmoAct2: [14, 16, 'start'], 'GR00T N1.7': [14, 5, 'start'], 'GPT-6 Astra (high, ultrafast)': [0, 52, 'middle', true] }}
      labelInk={DREAM_INK}
      caption="120 real-world attempts per configuration." /> },
  { id: 'd1-time-log', title: <><D1 /> beats every LLM in robotics while being faster than all of them</>, body: 'Mean score vs. time per task attempt',
    chart: () => <ParetoChart metric="time" models={ALL_TIME} labelAll labelOnly={new Set([...logLabels(TIME_LABELS), 'GPT-6 Astra (high, ultrafast)', 'MolmoAct2'])} label={(m) => (m.name === 'GPT-6 Astra (high, ultrafast)' ? 'GPT-6 Astra (ultrafast)' : timeLabelShort(m))} logX={[0.5, 30]} xTicks={[0.5, 1, 2, 5, 10, 20]}
      colAt={8.5} colBelow={0.24}
      yMax={1} yTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]} legend={false} frontierLabelAt={{ x: 12, s: 0.645 }} oldExclude={NEW_CFG} arrowAt="diag45" arrowTo="Dream-1" arrowLabel="1.3× better, 1.7× faster" oldLabelAt={{ x: 13, dy: 22, anchor: 'middle' }} labelInk={DREAM_INK}
      inlinePlace={{ 'Dream-1': [12, -14, 'start'], MolmoAct2: [14, 5, 'start'], 'GPT-6 Astra (high, ultrafast)': [64, 64, 'start', true, 'curve'], 'Gemini 4 Argon (high)': [-14, -24, 'middle', true] }} arrowLabelPos={[12, -6, 'start']}
      caption="120 real-world attempts per configuration." /> },
];

export const D1_PANELS = [
  { id: 'd1-lb', title: <><D1 /> achieves SOTA in robotics, the first to score above 50% on <span style={{ whiteSpace: 'nowrap' }}>RoboDojo-RC Tier 1</span></>, body: 'Mean score per task attempt', chart: Bars },
  { id: 'd1-cost', title: <><D1 /> beats every LLM in robotics while being cheaper than all of them</>, body: 'Mean score vs. estimated cost per task attempt',
    chart: () => <ParetoChart metric="cost" models={ALL} labelAll labelOnly={COST_LABELS} label={costLabel} colAt={4.2} colGap={26}
      xMax={12} xTicks={[0, 3, 6, 9, 12]} yMax={0.8} yTicks={[0, 0.2, 0.4, 0.6, 0.8]} legend={false} frontierLabelAt={{ x: 9.3, s: 0.645 }} oldExclude={NEW_CFG} arrowAt="diag45" arrowTo="Dream-1" arrowLabel="better &amp; cheaper" oldLabelAt={{ x: 7.6, dy: -12, anchor: 'middle' }}
      inlinePlace={{ 'Dream-1': [12, -14, 'start'], 'Opus 5.5 (xhigh)': [0, 40, 'middle', true], 'GPT-6 Astra (high, ultrafast)': [0, 50, 'middle', true] }} arrowLabelPos={[12, 0, 'start']}
      labelInk={DREAM_INK} colBelow={0.3}
      caption="120 attempts per configuration. Dream-1 at $3/h of hosted inference; GR00T N1.7 and MolmoAct2 at RTX 5090 rental; LLMs at list API prices." /> },
  { id: 'd1-time', title: <><D1 /> beats every LLM in robotics while being faster than all of them</>, body: 'Mean score vs. time per task attempt',
    chart: () => <ParetoChart metric="time" models={ALL_TIME} labelAll labelOnly={TIME_LABELS} label={timeLabel}
      yMax={0.8} yTicks={[0, 0.2, 0.4, 0.6, 0.8]} legend={false} frontierLabelAt={{ x: 17, s: 0.645 }} oldExclude={NEW_CFG} arrowAt="diag45" arrowTo="Dream-1" arrowLabel="better &amp; faster" oldLabelAt={16} labelInk={DREAM_INK} colBelow={0.30}
      inlinePlace={{ 'Dream-1': [12, -14, 'start'], 'Gemini 4 Argon (high)': [-6, -24, 'middle', true] }} arrowLabelPos={[12, 0, 'start']}
      caption="Dream-1: mean time to reach its final score. Others: wall-clock time per attempt. Unlabelled: other models and effort settings." /> },
  { id: 'd1-release', title: 'The best score on a real-robot benchmark rose from 10% to 59% in 6 months', body: BENCH,
    chart: () => <LogoReleaseChart wide models={ALL.filter((m) => m.released && !LLM_EXTRA.includes(m))} x0={day('2026-04-01')} x1={day('2026-11-01')} xTicks={REL_TICKS} today={day('2026-10-25')}
      place={RELEASE_PLACE} axisTitles={{ x: 'Model release date', y: 'Mean task progress' }} yMax={0.7} yTicks={[0, 0.2, 0.4, 0.6]} keepLabels={[]} hideLabels={['Gemini 3.8 Flash (high)']} fit={[{ name: 'All models', test: () => true, color: 'rgba(27,21,15,0.6)' }, { name: 'LLMs', test: (m) => !m.vla, color: '#4F6D8A' }, { name: 'VLAs', test: (m) => m.vla, color: '#C97A35' }]}
      ariaLabel="RoboDojo-RC Tier 1 mean score by model release date, April to October 2026. The best score released so far rises from GR00T N1.7 (10%, April 17) to MolmoAct2 (19%, May 4), Gemini 3.8 Flash high (36%, September 2), GPT-6 Astra high (43%, September 3), Gemini 4 Argon high (48%, October 13) and Dream-1 (59%, October 19)."
      caption="Score = mean task progress over 120 attempts (6 tasks). LLMs at high effort; VLAs at their default settings. Line = best score released so far." /> },
];

// 16:9 leaderboard (user 2026-10-18): X shows 16:9 uncropped in the feed and
// in quote-post cards, where a 4:5 card gets cropped. Horizontal bars so the
// eight names read on one line each at phone size.
import { useChartSize } from './useChartSize.js';
import { COLOR } from './LeaderboardBars.jsx';
import { LogoMarker } from './robodojoModels.jsx';
const HB_ROWS = ROWS.map((r) => ({ ...r, model: r.model === 'Molmo Act2' ? 'MolmoAct2' : r.model }));
const LAB_OF = { 'Dream-1': 'dreamlabs' };
function HBars() {
  const [ref, W, H] = useChartSize(520, 180);
  const LABEL_W = 178, VAL_W = 34, rowH = H / HB_ROWS.length;
  const x = (v) => LABEL_W + (v / 70) * (W - LABEL_W - VAL_W);
  return (
    <div className="rc-hbars" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mean score per attempt: ${HB_ROWS.map((r) => `${r.model} ${Math.round(r.value)}`).join(', ')}.`}>
        {[20, 40, 60].map((v) => <line key={v} x1={x(v)} x2={x(v)} y1={0} y2={H} className="rc-chart-grid" strokeDasharray="2 3" />)}
        {HB_ROWS.map((r, i) => {
          const cy = rowH * (i + 0.5), bh = Math.min(rowH * 0.66, 22), lead = i === 0;
          return (
            <g key={r.model}>
              <LogoMarker lab={LAB_OF[r.model] || r.lab} cx={10} cy={cy} />
              <text x={26} y={cy} dominantBaseline="central" className="rc-hbars-name" style={lead ? { fontWeight: 700, fill: LABEL_INK.dreamlabs } : undefined}>
                {r.model}{r.effort ? <tspan className="rc-hbars-effort"> ({r.effort})</tspan> : null}
              </text>
              <path d={`M${x(0)},${cy - bh / 2}H${x(r.value) - 4}a4,4 0 0 1 4,4V${cy + bh / 2 - 4}a4,4 0 0 1 -4,4H${x(0)}Z`} fill={COLOR[r.lab]} />
              <text x={x(r.value) + 6} y={cy} dominantBaseline="central" className="rc-hbars-val" style={lead ? { fontWeight: 700 } : undefined}>{Math.round(r.value)}%</text>
            </g>
          );
        })}
        <line x1={x(0)} x2={x(0)} y1={0} y2={H} className="rc-chart-axis" />
      </svg>
    </div>
  );
}
// Vertical bars (user 2026-10-18), effort dropped so names fit two lines.
const WIDE_ROWS = ROWS.map((r) => ({ ...r, effort: '' }));
const WIDE_NAMES = { 'Dream-1': ['Dream-1'], 'Opus 5.5': ['Opus 5.5'], 'Gemini 4 Argon': ['Gemini 4', 'Argon'], 'GPT-6 Astra': ['GPT-6', 'Astra'],
  'GPT-6.1 Sol': ['GPT-6.1', 'Sol'], 'Gemini 3.8 Flash': ['Gemini', '3.8 Flash'], 'Molmo Act2': ['Molmo', 'Act2'], 'GR00T N1.7': ['GR00T', 'N1.7'] };
const VBarsWide = () => (
  <BarCard bg="none" rows={WIDE_ROWS} ymax={64} grid={[20, 40, 60]} nameLines={(r) => WIDE_NAMES[r.model]} minBottom={60}
    aria={`Mean score per attempt: ${WIDE_ROWS.map((r) => `${r.model} ${Math.round(r.value)}`).join(', ')}.`}
    tip={(r) => (<><strong>{r.model}</strong><span>{Math.round(r.value)} avg score · 120 trials</span></>)} />
);
export const D1_WIDE_PANEL = { id: 'd1-lb-wide', title: D1_PANELS[0].title, body: D1_PANELS[0].body, chart: VBarsWide };
export const D1_WIDE_HBARS = HBars; // horizontal variant, kept for reference
