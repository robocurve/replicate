/* Hero bar cards in the study card's style (user 2026-09-30): bars
   coloured by company, the whole-number value in white inside each bar
   (or above it when the bar is too short), the company mark under the
   bar, and a two-line "Model / (effort)" label in one font.
   - LeaderboardBars: average score per trial from Robocurve's leaderboard
     data (working draft; assets/data/robocurve-leaderboard.json — high
     effort, Fast mode, 120 single-task trials per model).
   - SafetyBars: latest eligible RoboHarm trials per task/model, graded by
     Astra; actual denominators, grades and selection audit are on /all-runs/.
   Marks: Simple Icons (CC0) Anthropic and OpenAI paths, 24×24; Ai2's own
   pinwheel mark in brand pink. Google's multicolor G is Google's own asset:
   https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png */

import React from 'react';
import DATA from '../assets/data/robocurve-leaderboard.json';
import SAFETY from '../assets/data/safety-leaderboard.json';
import { useChartSize } from './useChartSize.js';

// Ai2's pinwheel mark: the first path of Ai2's colour logo
// (astra-molmo-report/src/assets/ai2-logo-color.svg), kept in brand pink.
const AI2_MARK = { d: 'M82,85.6h-41v-39h33c4.4,0,8-3.6,8-8V5.6h39v41c0,21.6-17.5,39-39,39ZM41,89.6H0v39h33c4.4,0,8,3.6,8,8v33h39v-41c0-21.6-17.5-39-39-39ZM172.1,87.6c-4.4,0-8-3.6-8-8v-33h-39v41c0,21.6,17.5,39,39,39h41v-39h-33ZM84,169.6v41h39v-33c0-4.4,3.6-8,8-8h33v-39h-41c-21.6,0-39,17.5-39,39Z', viewBox: '0 0 213.1 210.7', fill: '#F45096' };
const MARK = {
  nvidia: 'M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z',
  anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
  openai: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
};
// Anthropic clay, OpenAI ink (as on the study card), Ai2 pink, Google green.
export const COLOR = { anthropic: '#C8714F', openai: '#1B150F', ai2: '#F45096', google: '#34A853', nvidia: '#76B900', dreamlabs: '#FFB06C' };
// The name label's lines: one word per line once a bar's slot is too narrow
// for "Gemini 3.8" at 12px (7 bars on a phone-width card), else the
// two-line "Model / (effort)" (GPT and Gemini names split once on 5+ bars).
const nameLines = (r, rows, band) => {
  // "(medium)" is wider than a phone-width slot; "(med)" fits.
  const effort = r.effort ? [`(${band < 48 && r.effort === 'medium' ? 'med' : r.effort})`] : [];
  if (band < 60) return [...r.model.split(' '), ...effort];
  const model = rows.length >= 5
    ? (r.model.startsWith('GPT-') ? [r.model.split(' ')[0], r.model.split(' ').slice(1).join(' ')] : r.model.startsWith('Gemini') ? [r.model.split(' ').slice(0, 2).join(' '), r.model.split(' ').slice(2).join(' ')] : [r.model])
    : [r.model];
  return [...model, ...effort];
};

// `hop` ({ from, to, label }, model names) draws an arrow arcing from one
// bar's top to another's (Gemini 4 /draft/ card, user 2026-10-14).
// `bg` is the plot box fill (the /draft/ Gemini 4 cards pass 'none' to sit on the card's cream).
// `tie` ({ keys: ['model|effort', ...], label }) draws a bracket over bars that are
// statistically tied; a `hop` arrow then lands on the bracket (user 2026-10-14).
// `nameLines` (row => string[]) and `minBottom` override the name wrapping and
// the under-axis room (the /draft/ 16:9 Dream-1 card, user 2026-10-18).
export function BarCard({ rows, ymax, grid, aria, tip, hop = null, bg = '#fff', tie = null, nameLines: nameLinesFn = null, minBottom = 78 }) {
  // Drawn 1 unit = 1px across the card's width at a fixed 252px height
  // (.rc-lbars svg), so the model names stay 12px on phones.
  const [boxRef, W, H] = useChartSize(394, 252);
  const [hover, setHover] = React.useState(null);
  // Per-card clip ids: two BarCards on one page shared a fixed id and the second lost its Dream Labs logo.
  const clipId = `rc-lbars-dl-${React.useId().replace(/:/g, '')}`;
  const band = (W - 28) / rows.length;
  const lines = rows.map((r) => (nameLinesFn ? nameLinesFn(r) : nameLines(r, rows, band)));
  // Room under the axis for the company mark and the tallest name label.
  const M = { top: 14, right: 14, left: 14, bottom: Math.max(minBottom, 46 + (Math.max(...lines.map((l) => l.length)) - 1) * 13) };
  const BAR = Math.min(band * (rows.length > 3 ? 0.5 : 0.42), 64);
  const y = (v) => M.top + (1 - v / ymax) * (H - M.top - M.bottom);
  return (
    <div className="rc-lbars" ref={boxRef} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        <rect x={0} y={0} width={W} height={H} rx={6} fill={bg} />
        {grid.map((v) => <line key={v} x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" strokeDasharray="2 3" />)}
        {rows.map((r, i) => {
          const cx = M.left + band * (i + 0.5);
          const top = y(r.value), base = y(0), h = base - top;
          const inside = h >= 30;
          return (
            <g key={`${r.model}-${r.effort}`} onPointerEnter={() => setHover(r)} opacity={hover && hover !== r ? 0.45 : 1} style={{ transition: 'opacity .2s ease' }}>
              <rect x={cx - band / 2} y={0} width={band} height={H} fill="transparent" />
              {h > 0.5 && <path d={`M${cx - BAR / 2},${base}V${top + Math.min(5, h)}a5,5 0 0 1 5,-5H${cx + BAR / 2 - 5}a5,5 0 0 1 5,5V${base}Z`} fill={COLOR[r.lab]} />}
              <text x={cx} y={inside ? top + h * 0.45 + 5 : top - 7} textAnchor="middle" className={inside ? 'rc-lbars-val' : 'rc-lbars-val rc-lbars-val-out'} style={inside && r.lab === 'dreamlabs' ? { fill: '#1B1B1B' } : undefined}>{Math.round(r.value)}</text>
              {r.lab === 'ai2'
                ? <svg x={cx - 7} y={base + 7} width={14} height={14} viewBox={AI2_MARK.viewBox} aria-hidden="true"><path d={AI2_MARK.d} fill={AI2_MARK.fill} /></svg>
                : r.lab === 'dreamlabs' ? <g><defs><clipPath id={`${clipId}-${i}`}><circle cx={cx} cy={base + 14} r={8} /></clipPath></defs>
                  <image href="/assets/logo/dreamlabs-avatar.png" x={cx - 8} y={base + 6} width={16} height={16} clipPath={`url(#${clipId}-${i})`} aria-hidden="true" /></g>
                : r.lab === 'google' ? <image href="/assets/logo/google-g-color.png" x={cx - 7} y={base + 7} width={14} height={14} aria-hidden="true" />
                : <svg x={cx - 7} y={base + 7} width={14} height={14} viewBox="0 0 24 24" aria-hidden="true"><path d={MARK[r.lab]} fill={r.lab === 'nvidia' ? COLOR.nvidia : 'var(--neutral-900)'} /></svg>}
              <text x={cx} y={base + 36} textAnchor="middle" className="rc-lbars-name">
                {lines[i].map((part, line) => <tspan key={line} x={cx} dy={line ? 13 : 0}>{part}</tspan>)}
              </text>
            </g>
          );
        })}
        <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} className="rc-chart-axis" />
        {tie && (() => {
          const ks = rows.map((r, k) => (tie.keys.includes(`${r.model}|${r.effort}`) ? k : -1)).filter((k) => k >= 0);
          const x0 = M.left + band * (Math.min(...ks) + 0.5) - BAR / 2, x1 = M.left + band * (Math.max(...ks) + 0.5) + BAR / 2;
          const ty = Math.min(...ks.map((k) => y(rows[k].value))) - 14;
          return (
            <g>
              <path d={`M${x0},${ty + 6}V${ty}H${x1}V${ty + 6}`} fill="none" stroke="var(--neutral-900)" strokeWidth={1.4} strokeLinejoin="round" />
              <text x={(x0 + x1) / 2} y={ty - 6} textAnchor="middle" className="rc-lbars-val rc-lbars-val-out">{tie.label}</text>
            </g>
          );
        })()}
        {hop && (() => {
          // One symmetric arc between the two bar tops, clearing every bar
          // in between, with an open chevron head and the label at its crest.
          const i = rows.findIndex((r) => r.model === hop.from), j = rows.findIndex((r) => r.model === hop.to);
          const xi = M.left + band * (i + 0.5), xj = M.left + band * (j + 0.5);
          const tied = tie ? rows.map((r, k) => (tie.keys.includes(`${r.model}|${r.effort}`) ? k : -1)).filter((k) => k >= 0) : [];
          const tieY = tied.length ? Math.min(...tied.map((k) => y(rows[k].value))) - 14 : null;
          const yi = y(rows[i].value) - 6;
          // Onto a bar under a tie bracket, the arrow lands on the bar's top-right
          // corner from the side (heading left), below and clear of the bracket.
          const onTie = tied.includes(j);
          const xEnd = onTie ? xj + BAR / 2 + 5 : xj, yj = onTie ? y(rows[j].value) - 3 : y(rows[j].value) - 6;
          const lo = Math.min(i, j), hi = Math.max(i, j);
          const clear = Math.min(...rows.slice(lo, hi + 1).map((r) => y(r.value)), tieY ?? Infinity) - 30;
          const cy = 2 * clear - (yi + yj) / 2; // quadratic control so the crest sits at `clear`
          return (
            <g>
              <defs><marker id="rc-hop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M1,1 L8,5 L1,9" fill="none" stroke="var(--neutral-900)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></marker></defs>
              <path d={onTie ? (() => { // ballistic: one parabola from bar top to the corner, cresting above the bars between
                const crest = Math.min(...rows.slice(lo + 1, hi).map((r) => y(r.value)), yj) - 22;
                const cyT = 2 * crest - (yi + yj) / 2;
                return `M${xi},${yi} Q${(xi + xEnd) / 2},${cyT} ${xEnd},${yj}`;
              })() : `M${xi},${yi} Q${(xi + xj) / 2},${cy} ${xj},${yj}`} fill="none" stroke="var(--neutral-900)" strokeWidth={1.6} strokeLinecap="round" markerEnd="url(#rc-hop-arrow)" />
              {hop.label && <text x={(xi + xj) / 2} y={clear - 6} textAnchor="middle" className="rc-lbars-val rc-lbars-val-out">{hop.label}</text>}
            </g>
          );
        })()}
      </svg>
      {hover && (
        <div className="rc-chart-tip" role="status" style={{
          left: `${((M.left + band * (rows.indexOf(hover) + 0.5)) / W) * 100}%`, top: `${(y(hover.value) / H) * 100}%`,
          transform: `translate(${rows.indexOf(hover) >= rows.length / 2 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
        }}>
          {tip(hover)}
        </div>
      )}
    </div>
  );
}

const SCORES = [...DATA.models].sort((a, b) => b.score - a.score).map((m) => ({
  ...m, value: m.score, lab: m.lab || (/Claude|Opus/.test(m.name) ? 'anthropic' : 'openai'), model: m.name.replace(/^Claude /, ''), effort: m.effort || 'high',
}));

export function LeaderboardBars() {
  return (
    <BarCard rows={SCORES} ymax={45} grid={[15, 30, 45]}
      aria={`Average score per trial: ${SCORES.map((r) => `${r.model} (${r.effort}) ${Math.round(r.value)}`).join(', ')}.`}
      tip={(r) => (<><strong>{r.model} ({r.effort})</strong><span>{r.mode === 'fast' ? 'Fast mode' : 'Standard mode'}</span><span>{Math.round(r.value)} avg score · {r.n_attempts || r.n_trials * 6} trials</span><span>{r.cost_is_estimate ? 'Est. ' : ''}${(r.cost_usd / 6).toFixed(2)} per trial</span></>)} />
  );
}

// Current safety cohort: newest eligible trials per model/task, not the
// original report's first-20 human-labelled cohort. Source audit ships with runs.
const REFUSALS = SAFETY.models.map((r) => ({ ...r, value: 100 * r.refused / r.n })).sort((a, b) => b.value - a.value);

export function SafetyBars() {
  return (
    <BarCard rows={REFUSALS} ymax={50} grid={[10, 20, 30, 40, 50]}
      aria={`Share of harmful instructions refused: ${REFUSALS.map((r) => `${r.model} ${r.refused} of ${r.n}`).join(', ')}. Provider guardrail blocks are separate.`}
      tip={(r) => (<><strong>{r.model} ({r.effort})</strong><span>Refused {r.refused} of {r.n} harmful instructions</span><span>Harm threshold crossed: {r.completed} of {r.n}</span><span>Provider guardrail blocks: {r.guardrail_blocked}</span></>)} />
  );
}
