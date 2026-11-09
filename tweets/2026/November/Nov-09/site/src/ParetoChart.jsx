/* RoboDojo-RC Tier 1 score vs cost, or vs wall-clock time, per task
   attempt — the Pareto chart from the GPT-6 Sol report's showcase video,
   simplified to one labelled mark per model config and the dotted
   frontier (user 2026-09-29). `metric` picks the x-axis: 'cost' (USD) or
   'time' (minutes). Data, colours and glyphs live in robodojoModels.jsx.
   The frontier — every config that nothing cheaper (or faster) beats — is
   derived; both frontiers are anchored at the origin like the video's.

   Laid out at the container's real width (useChartSize), so type stays at
   its CSS size. Below NARROW px the hand-placed labels would collide, so
   only the Pareto-frontier models are labelled, as callouts (placeLabels.js)
   (user 2026-10-02); the rest stay tappable. */

import React from 'react';
import { PARETO_RUNS } from './runs.mjs';
import { LAB, MODELS, VLA_MODELS, LogoMarker, LegendGlyph, withMode, LABEL_INK } from './robodojoModels.jsx';

import { useChartSize } from './useChartSize.js';
import { placeLabels } from './placeLabels.js';

// LLM configs plus the self-hosted VLA baselines; the frontier spans both.
const POINTS = [...MODELS, ...VLA_MODELS];

const METRICS = {
  cost: {
    better: 'Cheaper', // direction cue under the x axis: left is better
    // Log x (user 2026-10-19): the VLAs sit at $0.05-0.15, the LLMs at $0.66-3.48.
    get: (m) => m.cost, min: 0.04, max: 5, ticks: [0.05, 0.1, 0.25, 0.5, 1, 2, 4], tick: (v) => (v < 1 ? `$${v.toFixed(2)}` : `$${v}`), fmt: (v) => `$${v.toFixed(2)} per attempt`, short: (v) => `$${v.toFixed(2)}`,
    // label placement per config: [dx, dy, anchor]
    // Log-x placement (user 2026-10-19): the $2-3.5 cluster's labels stack in
    // the empty lower right, Gemini 4 Argon's under Dream-1's frontier line.
    place: {
      'GPT-6 Astra (high)': [40, 60, 'end'], 'Opus 5.5 (high)': [0, 34, 'middle'],
      'GPT-6.1 Sol (high)': [-21, -16, 'end'],
      'GPT-6 Astra (medium)': [-10, 26, 'end'], 'Opus 5.5 (medium)': [-49, -15, 'end'],
      'GPT-6 Sol (high)': [-14, 4, 'end'], 'GPT-5.6 Sol (high)': [-14, 4, 'end'],
      'Gemini 3.8 Flash (high)': [-14, 4, 'end'],
      'Gemini 4 Argon (high)': [-14, -16, 'end'],
      'GR00T N1.7': [12, 4, 'start'], MolmoAct2: [12, 4, 'start'],
      'Dream-1': [12, -14, 'start'], // top-left, above every LLM
    },
  },
  // Log x to 30 min: Gemini 4 Argon averages ~20.5 min per attempt, the VLAs under 1.5.
  time: {
    better: 'Faster',
    get: (m) => m.mins, min: 0.5, max: 30, ticks: [0.5, 1, 2, 5, 10, 20], tick: (v) => `${v} min`, fmt: (v) => `${v.toFixed(1)} min per attempt`, short: (v) => `${v.toFixed(1)} min`,
    place: {
      // Log x: the 3-4.5 min cluster's labels fan out left, above and below-right of it.
      'GPT-6 Astra (high)': [30, -4, 'start'], 'Opus 5.5 (high)': [-14, 4, 'end'],
      'GPT-6.1 Sol (high)': [-19, -21, 'end'],
      'GPT-6 Astra (medium)': [24, 20, 'start'], 'Opus 5.5 (medium)': [15, 32, 'start'],
      'GPT-6 Sol (high)': [14, 10, 'start'], 'GPT-5.6 Sol (high)': [14, 10, 'start'],
      'Gemini 3.8 Flash (high)': [14, 5, 'start'],
      'Gemini 4 Argon (high)': [-14, -16, 'end'],
      'GR00T N1.7': [12, 4, 'start'], MolmoAct2: [12, 4, 'start'],
      'Dream-1': [12, -14, 'start'],
    },
  },
};

// Container px below which the hand-placed labels would collide at 12px:
// only frontier models get (auto-placed) labels. Must match the `@container rc-chart (max-width: 599px)`
// rule in tokens/base.css (test/screen-constants.test.mjs checks).
export const NARROW = 600;
// top: the 'Mean score' y-axis title; bottom: tick labels + the ← Cheaper/Faster cue.
const M = { top: 30, right: 24, bottom: 50, left: 44 };
const YMAX = 1; // full 0–100% scale (user 2026-09-30)
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const pct = (s) => `${(s * 100).toFixed(1)}%`;

export function ParetoChart({ metric = 'cost', width = 720, height = 390 }) {
  const X = METRICS[metric];
  const [plotRef, W, H] = useChartSize(width, height);
  const narrow = W < NARROW;
  const x = (v) => M.left + (Math.log(v / X.min) / Math.log(X.max / X.min)) * (W - M.left - M.right);
  const y = (s) => M.top + (1 - s / YMAX) * (H - M.top - M.bottom);
  let best = -1;
  const order = [...POINTS].sort((a, b) => X.get(a) - X.get(b));
  const frontierList = order.filter((m) => (m.score > best ? ((best = m.score), true) : false));
  const frontier = new Set(frontierList.map((m) => m.name));
  const pts = frontierList.map((m) => `${x(X.get(m))},${y(m.score)}`);
  // The last frontier point holds flat to the plot's right edge: nothing
  // costlier (or slower) does better (user 2026-10-07).
  // Starts at the plot's origin corner (axis minimum, 0%): log x has no zero (user 2026-10-19).
  const path = `M${x(X.min)},${y(0)}L${pts.join('L')}H${W - M.right}`;
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const pick = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
    let hit = null, bd = 22 * 22;
    for (const m of POINTS) {
      const dd = (x(X.get(m)) - mx) ** 2 + (y(m.score) - my) ** 2;
      if (dd < bd) { bd = dd; hit = m; }
    }
    setHover(hit);
  };
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = hover ? order.indexOf(hover) : -1;
    setHover(order[e.key === 'ArrowRight' ? Math.min(order.length - 1, i + 1) : Math.max(0, i < 0 ? order.length - 1 : i - 1)]);
  };
  const hx = hover ? x(X.get(hover)) : 0, hy = hover ? y(hover.score) : 0;
  const narrowLabels = narrow ? placeLabels(
    frontierList.map((m) => ({ key: m.name, x: x(X.get(m)), y: y(m.score), text: withMode(m) })).reverse(),
    // y0 below the 'Mean score' title so no callout lands on it.
    { x0: M.left + 2, y0: M.top + 4, x1: W - 2, y1: H - M.bottom - 4 },
  ) : [];
  const valueText = (m) => (m.vla && metric === 'cost' ? `${X.fmt(X.get(m))} (${m.hosted ? 'hosted inference' : 'GPU rental'})` : X.fmt(X.get(m)));
  const summary = order.map((m) => `${withMode(m)} ${pct(m.score)} at ${valueText(m)}${frontier.has(m.name) ? ' (frontier)' : ''}`).join('; ');
  return (
    <figure className="rc-chart">
      <ul className="rc-chart-legend" aria-label="Lab">
        <li style={{ color: LABEL_INK.anthropic }}><LegendGlyph kind="dot" color={LAB.anthropic} lab="anthropic" ring={LABEL_INK.anthropic} />Anthropic</li>
        <li style={{ color: LABEL_INK.openai }}><LegendGlyph kind="dot" color={LAB.openai} lab="openai" ring={LABEL_INK.openai} />OpenAI</li>
        <li style={{ color: LABEL_INK.google }}><LegendGlyph kind="dot" color={LAB.google} lab="google" ring={LABEL_INK.google} />Google</li>
        <li style={{ color: LABEL_INK.nvidia }}><LegendGlyph kind="dot" color={LAB.nvidia} lab="nvidia" ring={LABEL_INK.nvidia} />NVIDIA</li>
        <li style={{ color: LABEL_INK.ai2 }}><LegendGlyph kind="dot" color={LAB.ai2} lab="ai2" ring={LABEL_INK.ai2} />Ai2</li>
        <li style={{ color: LABEL_INK.dreamlabs }}><LegendGlyph kind="dot" color={LAB.dreamlabs} lab="dreamlabs" ring={LABEL_INK.dreamlabs} />Dream Labs</li>
        <li><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" className="rc-chart-frontier" /></svg>Pareto frontier</li>
      </ul>
      <div className="rc-chart-plot" ref={plotRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0}
          aria-label={`Scatter of RoboDojo-RC Tier 1 mean score against ${metric === 'cost' ? 'estimated cost' : 'time'} per task attempt. ${summary}. Use arrow keys to step through models.`}
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          {/* Y-axis title above the tick column, as on the speed chart (user 2026-10-17). */}
          <text x={0} y={16} className="rc-chart-tick" textAnchor="start">Mean score</text>
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />
              <text x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {X.ticks.map((c) => (
            <text key={c} x={x(c)} y={H - M.bottom + 18} className="rc-chart-tick" textAnchor="middle">{X.tick(c)}</text>
          ))}
          {/* Direction cue, centred under the axis: an arrow pointing left (better), the word, then
             the line's tail on its right. */}
          {(() => {
            // Word centred under the axis; equal gaps to the line on each side.
            const cy = H - M.bottom + 36, len = 64, half = X.better.length * 3.4 + 8;
            const mid = (M.left + W - M.right) / 2;
            return (
              <g stroke="rgba(27,21,15,0.45)" strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={`M${mid - half},${cy}H${mid - half - len}m5,-4l-5,4l5,4`} />
                <path d={`M${mid + half},${cy}h${len}`} />
                <text x={mid} y={cy} textAnchor="middle" className="rc-chart-tick" dominantBaseline="middle" stroke="none">{X.better}</text>
              </g>
            );
          })()}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />

          <path d={path} fill="none" className="rc-chart-frontier" />

          {/* Frontier names take their lab's colour (OpenAI stays ink), as on
             the release-date chart (user 2026-10-07). */}
          {/* Frontier models drawn last so their badges sit on top of any
             overlapping off-frontier ones (user 2026-10-07). */}
          {[...POINTS].sort((a, b) => frontier.has(a.name) - frontier.has(b.name)).map((m) => {
            const [dx, dy, anchor] = X.place[m.name];
            const front = frontier.has(m.name);
            const cx = x(X.get(m)), cy = y(m.score);
            return (
              <g key={m.name}>
                {/* Leader for any label set well off its point; stops above labels below the point, and below labels above it. */}
                {!narrow && Math.hypot(dx, dy) > 24 && <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy + (dy > 0 ? -16 : 4)} stroke="var(--neutral-900)" strokeWidth={0.6} opacity={0.35} />}
                {/* Lab logo badges, as on the release-date chart (user 2026-10-07). */}
                <LogoMarker lab={m.lab} cx={cx} cy={cy} big={front} ring={LABEL_INK[m.lab]} />
                {!narrow && <text x={cx + dx} y={cy + dy} textAnchor={anchor} className={front ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'}
                  style={front && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>{withMode(m)}</text>}
              </g>
            );
          })}

          {narrowLabels.map((l) => {
            const m = POINTS.find((mm) => mm.name === l.key);
            return (
              <g key={l.key}>
                <line {...l.leader} stroke="var(--neutral-900)" strokeWidth={0.75} opacity={0.4} />
                <text x={l.x} y={l.y} textAnchor={l.anchor} className="rc-chart-label rc-chart-label-strong" style={m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>
                  {l.lines.map((t, i) => <tspan key={i} x={l.x} dy={i ? 14 : 0}>{t}</tspan>)}
                </text>
              </g>
            );
          })}

          {hover && <circle cx={hx} cy={hy} r={14} fill="none" stroke={LAB[hover.lab]} strokeWidth={1.5} pointerEvents="none" />}
        </svg>
        {hover && (
          <div className="rc-chart-tip" role="status" style={{
            left: `${(hx / W) * 100}%`, top: `${(hy / H) * 100}%`,
            transform: `translate(${hx > W * 0.6 ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
          }}>
            <strong>{withMode(hover)}</strong>
            <span>{pct(hover.score)} score · {valueText(hover)}</span>
            <span>{frontier.has(hover.name) ? 'On the Pareto frontier' : 'Below the frontier'} · {hover.n} attempts</span>
          </div>
        )}
      </div>
      <figcaption className="rc-chart-cap">
        Mean score on <a href="/opus-5-5-robodojo-rc-tier-1/">RoboDojo-RC Tier 1</a> vs. {metric === 'cost' ? 'estimated cost' : 'time'} per task attempt, 120 attempts per configuration. Caps: 40 model calls for LLMs, 3,600 control steps for VLAs.{metric === 'cost' ? ' GR00T N1.7 and MolmoAct2 are marked at $1.19/hr as the RunPod on-demand rate for an RTX 5090; Dream-1 at $3/hr for Dream Labs-hosted inference.' : ' LLMs: wall-clock time per attempt (they can end an attempt with done or give-up). VLAs, which always run to their cap: mean time to reach their final score.'} Source: <a href={PARETO_RUNS}>All runs</a>.
      </figcaption>
      <div className="rc-sr-only"><table>
        <caption>Score and {metric} per model config, RoboDojo-RC Tier 1</caption>
        <thead><tr><th scope="col">Model</th><th scope="col">Mean score</th><th scope="col">{metric === 'cost' ? 'Cost per attempt' : 'Minutes per attempt'}</th><th scope="col">Pareto frontier</th></tr></thead>
        <tbody>
          {order.map((m) => <tr key={m.name}><td>{withMode(m)}</td><td>{pct(m.score)}</td><td>{valueText(m)}</td><td>{frontier.has(m.name) ? 'Yes' : 'No'}</td></tr>)}
        </tbody>
      </table></div>
    </figure>
  );
}
