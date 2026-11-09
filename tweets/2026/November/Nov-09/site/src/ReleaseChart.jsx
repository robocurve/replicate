/* RoboDojo-RC Tier 1 score vs model release date, with each lab's
   frontier over time — the best score that lab has released so far, as a
   step line running out to today (user 2026-09-29). Same models, colours
   and glyphs as the Pareto chart (robodojoModels.jsx).

   Laid out at the container's real width (useChartSize); below NARROW px
   only frontier models are labelled, placed by placeLabels.js
   (user 2026-10-02), and the frontier-end scores are dropped.

   `overall` swaps the per-lab lines for a single step line: the best score
   any lab has released so far; `logos` draws each point as its product
   mark (GPT, Claude, Gemini) instead of a dot or glyph; `keepLabels`, when
   set, hides every off-frontier label but those named (user 2026-10-05). */

import React from 'react';
import { PARETO_RUNS } from './runs.mjs';
import { LAB, LAB_NAME, MODELS, VLA_MODELS, Marker, LogoMarker, LegendGlyph, glyph, LABEL_INK } from './robodojoModels.jsx';
import { useChartSize } from './useChartSize.js';
import { NARROW } from './ParetoChart.jsx';
import { placeLabels } from './placeLabels.js';

const day = (iso) => Date.parse(`${iso}T00:00:00Z`);
// The axis ends today, so the frontier reaches the right edge (bump both together).
const TODAY = day('2026-10-20'); // just past Dream-1's 2026-10-19 release
const X0 = day('2026-07-01'), X1 = TODAY;
// With the VLA baselines (`vlas`), the axis reaches back to GR00T N1.7's release.
const VLA_X0 = day('2026-04-01');
const VLA_X_TICKS = [['2026-04-01', 'Apr'], ['2026-06-01', 'Jun'], ['2026-08-01', 'Aug'], ['2026-10-01', 'Oct']];
const YMAX = 1; // full 0–100% scale (user 2026-09-30)
const X_TICKS = [['2026-07-01', 'Jul'], ['2026-08-01', 'Aug'], ['2026-09-01', 'Sep'], ['2026-10-01', 'Oct']];
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

// Label placement for this chart (the Astra pair shares a date).
const PLACE = {
  'GPT-5.6 Sol (high)': { dx: -6, dy: 22, anchor: 'start' },
  'GPT-6 Astra (high)': { dx: -12, dy: -6, anchor: 'end' },
  'GPT-6 Astra (medium)': { dx: -12, dy: 12, anchor: 'end' },
  'Opus 5.5 (high)': { dx: 0, dy: 34, anchor: 'middle' }, // under its own (medium) marker: left of it, GPT-6 Astra's marker covered it
  'Opus 5.5 (medium)': { dx: 10, dy: 16, anchor: 'start' },
  'GPT-6 Sol (high)': { dx: -10, dy: 18, anchor: 'end' },
  'GPT-6.1 Sol (high)': { dx: 12, dy: 26, anchor: 'start' }, // below: Gemini 4 Argon's label sits above
  'Gemini 3.8 Flash (high)': { dx: -30, dy: 50, anchor: 'end' },
  'Gemini 4 Argon (high)': { dx: 0, dy: -18, anchor: 'middle' },
  // GR00T and MolmoAct2 are 17 days apart: both labels sit to the left of their points.
  'GR00T N1.7': { dx: -14, dy: 4, anchor: 'end' },
  MolmoAct2: { dx: -14, dy: 4, anchor: 'end' },
};

// The /draft/ X frame (`wide` at ~400px): the late-September cluster is
// tight, so its labels move clear of the markers and the riser.
const WIDE_PLACE = {
  'GPT-6.1 Sol (high)': { dx: 10, dy: -16, anchor: 'end' },
  'Opus 5.5 (high)': { dx: 0, dy: 19, anchor: 'middle' },
  'GPT-6 Sol (high)': { dx: -40, dy: 26, anchor: 'start' },
};

// With `vlas`, the 2026 LLM cluster is compressed: Argon's label sits up-left,
// clear of GPT-6 Astra's.
const VLA_PLACE = { 'Gemini 4 Argon (high)': { dx: -14, dy: -24, anchor: 'end' } };

// Frontier models are always labelled; one without a hand-tuned spot (a new
// release, or the success metric) still gets a label up and to the left.
const DEFAULT_PLACE = { dx: -12, dy: -12, anchor: 'end' };

// Phone placement of the overall frontier's labels.
const NARROW_OVERALL_PLACE = {
  'GPT-5.6 Sol (high)': { dx: -8, dy: 24, anchor: 'start' },
  'Gemini 3.8 Flash (high)': { dx: -16, dy: 5, anchor: 'end' },
  'GPT-6 Astra (high)': { dx: -12, dy: -12, anchor: 'end' },
  // VLAs sit near the left edge: labels to the right of their points.
  'GR00T N1.7': { dx: 14, dy: 20, anchor: 'start' },
  MolmoAct2: { dx: 12, dy: -14, anchor: 'start' },
};

// Frontier: models (by release date) that beat everything released before
// them; same-day releases collapse to the best of the day.
const frontier = (models) => {
  let best = -1;
  const steps = [...models]
    .sort((a, b) => day(a.released) - day(b.released) || b.score - a.score)
    .filter((m) => (m.score > best ? ((best = m.score), true) : false));
  return { steps, end: steps[steps.length - 1].score };
};
const INK = 'rgba(27,21,15,0.55)';
const frontierSet = (fs) => new Set(fs.flatMap((f) => f.steps.map((m) => m.name)));
// Per-lab and overall frontiers for one metric (`score` holds the metric).
const buildFrontiers = (models) => {
  // Only labs with release-dated models (the VLA labs have none here).
  const lab = Object.keys(LAB).filter((l) => models.some((m) => m.lab === l)).map((l) => ({ lab: l, color: LAB[l], name: LAB_NAME[l], ...frontier(models.filter((m) => m.lab === l)) }));
  const overall = [{ lab: 'all', color: '#1B150F', name: 'Frontier', ...frontier(models) }];
  return { models, lab, overall, labOn: frontierSet(lab), overallOn: frontierSet(overall) };
};
// `metric="success"` plots each model's full-completion rate in place of
// mean task progress (the /draft/ success card, user 2026-10-07).
const METRICS = {
  progress: buildFrontiers(MODELS),
  // Homepage (`vlas`): the VLA baselines join the points and the frontiers.
  vlas: buildFrontiers([...MODELS, ...VLA_MODELS]),
  success: buildFrontiers(MODELS.map((m) => ({ ...m, score: m.success }))),
};
const stepPath = (steps, x, y) => {
  let d = '';
  steps.forEach((m, i) => { d += i === 0 ? `M${x(day(m.released))},${y(m.score)}` : `H${x(day(m.released))}V${y(m.score)}`; });
  return `${d}H${x(TODAY)}`;
};
const pct = (s) => `${(s * 100).toFixed(1)}%`;
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function ReleaseChart({ width = 720, height = 390, overall = false, logos = false, keepLabels = null, wide = false, colorLabels = false, sourceLink = true, caption = null, axisTitles = null, yTitle = null, metric = 'progress', yMax = YMAX, yTicks = Y_TICKS, place = null, ariaLabel = null, vlas = false }) {
  const [plotRef, W, H] = useChartSize(width, height);
  const set = METRICS[vlas && metric === 'progress' ? 'vlas' : metric];
  const models = set.models;
  const x0 = vlas ? VLA_X0 : X0;
  const ticks = vlas ? VLA_X_TICKS : X_TICKS;
  // Compressed cluster: only frontier and VLA names are drawn (the rest on hover).
  const kept = vlas ? [] : keepLabels;
  const FRONTIERS = overall ? set.overall : set.lab;
  const onFrontier = overall ? set.overallOn : set.labOn;
  // `wide` keeps the desktop labelling at any width (the /draft/ X frame).
  const narrow = !wide && W < NARROW;
  // The right margin holds the frontier-end lab names (no scores, user
  // 2026-10-02).
  // `axisTitles` ({ x, y }, the /draft/ X frame) adds room for Epoch-style
  // axis titles: y rotated in the left margin, x under the ticks.
  const M = { top: yTitle && !axisTitles ? 30 : 14, right: narrow || wide ? 20 : 76, bottom: axisTitles ? 52 : 32, left: axisTitles ? 62 : 44 };
  const x = (t) => M.left + ((t - x0) / (X1 - x0)) * (W - M.left - M.right);
  const y = (s) => M.top + (1 - s / yMax) * (H - M.top - M.bottom);
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const pick = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
    let best = null, bd = 22 * 22;
    for (const m of models) {
      const dd = (x(day(m.released)) - mx) ** 2 + (y(m.score) - my) ** 2;
      if (dd < bd) { bd = dd; best = m; }
    }
    setHover(best);
  };
  const order = React.useMemo(() => [...models].sort((a, b) => day(a.released) - day(b.released) || a.score - b.score), [models]);
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = hover ? order.indexOf(hover) : -1;
    setHover(order[e.key === 'ArrowRight' ? Math.min(order.length - 1, i + 1) : Math.max(0, i < 0 ? order.length - 1 : i - 1)]);
  };
  // Overall view labels every frontier model on phones too (user
  // 2026-10-05), hand-placed clear of the step line.
  const narrowLabels = narrow && overall ? set.overall[0].steps.map((m) => {
    const p = NARROW_OVERALL_PLACE[m.name] || DEFAULT_PLACE, lx = x(day(m.released)) + p.dx, ly = y(m.score) + p.dy;
    return { key: m.name, x: lx, y: ly, anchor: p.anchor, lines: [m.name], leader: { x1: 0, y1: 0, x2: 0, y2: 0 } };
  }) : narrow ? placeLabels(
    // Every frontier step, not just each lab's leader (user 2026-10-07).
    FRONTIERS.flatMap((f) => f.steps).sort((a, b) => b.score - a.score)
      .map((m) => ({ key: m.name, x: x(day(m.released)), y: y(m.score), text: m.name })),
    { x0: M.left + 2, y0: 2, x1: W - 2, y1: H - M.bottom - 4 },
  ) : [];
  const hx = hover ? x(day(hover.released)) : 0, hy = hover ? y(hover.score) : 0;
  return (
    <figure className="rc-chart">
      <ul className="rc-chart-legend" aria-label="Lab">
        <li style={colorLabels ? { color: LABEL_INK.anthropic } : undefined}><LegendGlyph kind="dot" color={LAB.anthropic} lab={logos ? 'anthropic' : undefined} ring={colorLabels ? LABEL_INK.anthropic : undefined} />Anthropic</li>
        <li style={colorLabels ? { color: LABEL_INK.openai } : undefined}><LegendGlyph kind="dot" color={LAB.openai} lab={logos ? 'openai' : undefined} ring={colorLabels ? LABEL_INK.openai : undefined} />OpenAI</li>
        <li style={colorLabels ? { color: LABEL_INK.google } : undefined}><LegendGlyph kind="dot" color={LAB.google} lab={logos ? 'google' : undefined} ring={colorLabels ? LABEL_INK.google : undefined} />Google</li>
        {vlas && <li style={colorLabels ? { color: LABEL_INK.nvidia } : undefined}><LegendGlyph kind="dot" color={LAB.nvidia} lab={logos ? 'nvidia' : undefined} ring={colorLabels ? LABEL_INK.nvidia : undefined} />NVIDIA</li>}
        {vlas && <li style={colorLabels ? { color: LABEL_INK.ai2 } : undefined}><LegendGlyph kind="dot" color={LAB.ai2} lab={logos ? 'ai2' : undefined} ring={colorLabels ? LABEL_INK.ai2 : undefined} />Ai2</li>}
        {vlas && <li style={colorLabels ? { color: LABEL_INK.dreamlabs } : undefined}><LegendGlyph kind="dot" color={LAB.dreamlabs} lab={logos ? 'dreamlabs' : undefined} ring={colorLabels ? LABEL_INK.dreamlabs : undefined} />Dream Labs</li>}
        <li><svg width="18" height="10" aria-hidden="true"><path d="M1 8H9V2H17" fill="none" stroke={INK} strokeWidth="2" /></svg>{overall ? 'Overall frontier' : 'Lab frontier'}</li>
      </ul>
      <div className="rc-chart-plot" ref={plotRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0}
          aria-label={ariaLabel || (vlas ? "RoboDojo-RC Tier 1 mean score by model release date, April to October 2026, with the overall frontier: the best score released so far starts at the GR00T N1.7 VLA (10%, April 17), rises to the MolmoAct2 VLA (19%, May 4), then Gemini 3.8 Flash high (36%, September 2), GPT-6 Astra high (43%, September 3) and Gemini 4 Argon high (48%, October 13). Use arrow keys to step through models." : overall ? "RoboDojo-RC Tier 1 mean score by model release date, July to October 2026, with the overall frontier: the best score released so far rises from GPT-5.6 Sol high (15%, July 9) to Gemini 3.8 Flash high (36%, September 2), GPT-6 Astra high (43%, September 3) and Gemini 4 Argon high (48%, October 13). Use arrow keys to step through models." : "RoboDojo-RC Tier 1 mean score by model release date, July to October 2026. OpenAI's frontier rises from GPT-5.6 Sol high (15%, July 9) to GPT-6 Astra high (43%, September 3); Anthropic's Opus 5.5 high scores 38% (September 22). GPT-6 Sol high, released September 23, scores 22%. GPT-6.1 Sol high, released September 29, scores 42%. Gemini 3.8 Flash high, released September 2, scores 36%; Gemini 4 Argon high, released October 13, scores 48%. Use arrow keys to step through models.")}
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />
              <text x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {ticks.map(([iso, label], i) => (
            <text key={iso} x={x(day(iso))} y={H - M.bottom + 18} className="rc-chart-tick"
              textAnchor={narrow && i === ticks.length - 1 ? 'end' : 'middle'}>{narrow ? (vlas ? `${label} ’${iso.slice(2, 4)}` : label) : overall ? `${label} ${iso.slice(0, 4)}` : `${label} ’${iso.slice(2, 4)}`}</text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />
          {/* Homepage y-axis title above the tick column (the /draft/ frame uses axisTitles instead). */}
          {yTitle && !axisTitles && <text x={0} y={16} className="rc-chart-tick" textAnchor="start">{yTitle}</text>}
          {axisTitles && <>
            <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" className="rc-chart-axistitle">{axisTitles.x}</text>
            <text transform={`translate(12 ${(M.top + H - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="middle" className="rc-chart-axistitle">{axisTitles.y}</text>
          </>}

          {FRONTIERS.map((f) => (
            <path key={f.lab} d={stepPath(f.steps, x, y)} fill="none" stroke={f.color} strokeWidth={2} strokeLinejoin="round" opacity={0.75} />
          ))}
          {/* Frontier end labels: swatch in the lab colour, text in ink. */}
          {!narrow && !overall && FRONTIERS.map((f) => (
            <g key={f.lab} transform={`translate(${x(TODAY)} ${y(f.end)})`}>
              {f.lab === 'google' && <line x1={0} y1={0} x2={6} y2={36} stroke="var(--neutral-900)" strokeWidth={0.6} opacity={0.35} />}
              <text x={8} y={f.lab === 'google' ? 36 : 0} dominantBaseline="middle" className="rc-chart-ratelab">{f.name}</text>
            </g>
          ))}

          {(overall ? [...models].sort((a, b) => onFrontier.has(a.name) - onFrontier.has(b.name)) : models).map((m) => {
            // The overall line runs along GPT-5.6 Sol's 15% under the Gemini
            // label's default spot, so there it sits beside the riser instead
            // (no leader).
            // With GPT-6 Astra (medium)'s label hidden (keepLabels), Gemini's can sit
            // level with its point.
            const p = place?.[m.name] || (vlas && VLA_PLACE[m.name]) || (overall && m.lab === 'google'
              ? (kept && !kept.includes('GPT-6 Astra (medium)') ? { dx: -16, dy: 5, anchor: 'end' } : { dx: -14, dy: 30, anchor: 'end' })
              : (wide && WIDE_PLACE[m.name]) || PLACE[m.name] || DEFAULT_PLACE);
            const front = onFrontier.has(m.name);
            const cx = x(day(m.released)), cy = y(m.score);
            // Overall views fade everything off the frontier so the frontier
            // models read at a glance (user 2026-10-05).
            return (
              <g key={m.name} opacity={overall && !front && !m.vla ? 0.7 : 1}>
                {!narrow && !overall && m.lab === 'google' && <line x1={cx} y1={cy} x2={cx + p.dx} y2={cy + p.dy - 10} stroke="var(--neutral-900)" strokeWidth={0.6} opacity={0.35} />}
                <g opacity={overall && !front && !m.vla ? 0.45 : 1}>{logos
                  ? <LogoMarker lab={m.lab} cx={cx} cy={cy} big={front} ring={colorLabels ? LABEL_INK[m.lab] : undefined} />
                  : <Marker kind={glyph(m.name)} cx={cx} cy={cy} color={LAB[m.lab]} big={front} />}</g>
                {!narrow && (!kept || front || m.vla || kept.includes(m.name)) && <text x={cx + p.dx} y={cy + p.dy} textAnchor={p.anchor} className={front ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'} style={colorLabels && front && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>{m.name}</text>}
              </g>
            );
          })}

          {narrowLabels.map((l) => {
            const m = models.find((mm) => mm.name === l.key);
            return (
              <g key={l.key}>
                <line {...l.leader} stroke="var(--neutral-900)" strokeWidth={0.75} opacity={0.4} />
                <text x={l.x} y={l.y} textAnchor={l.anchor} className="rc-chart-label rc-chart-label-strong" style={colorLabels && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>
                  {l.lines.map((t, i) => <tspan key={i} x={l.x} dy={i ? 14 : 0}>{t}</tspan>)}
                </text>
              </g>
            );
          })}

          {hover && <circle cx={hx} cy={hy} r={logos ? 16 : 10} fill="none" stroke={LAB[hover.lab]} strokeWidth={1.5} pointerEvents="none" />}
        </svg>
        {hover && (
          <div className="rc-chart-tip" role="status" style={{
            left: `${(hx / W) * 100}%`, top: `${(hy / H) * 100}%`,
            transform: `translate(${hx > W * 0.6 ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
          }}>
            <strong>{hover.name}</strong>
            <span>{pct(hover.score)} {metric === 'success' ? 'success rate' : 'score'} · released {fmtDate(hover.released)}</span>
            <span>{overall
              ? (onFrontier.has(hover.name) ? 'Overall frontier' : 'Below the overall frontier')
              : (onFrontier.has(hover.name) ? `${LAB_NAME[hover.lab]} frontier` : `Below ${LAB_NAME[hover.lab]}’s frontier`)} · {hover.n} attempts</span>
          </div>
        )}
      </div>
      <figcaption className="rc-chart-cap">
        {caption || <>Mean score on <a href="/opus-5-5-robodojo-rc-tier-1/">RoboDojo-RC Tier 1</a> over 120 task attempts per configuration, by public release date.{vlas && <> Caps: 40 model calls for LLMs, 3,600 control steps for VLAs. GR00T N1.7 and MolmoAct2 are dated by their first public weights, Dream-1 by Dream Labs' public release.</>}{sourceLink && <> Source: <a href={PARETO_RUNS}>All runs</a>.</>}</>}
      </figcaption>
      <div className="rc-sr-only"><table>
        <caption>RoboDojo-RC Tier 1 score by release date</caption>
        <thead><tr><th scope="col">Model</th><th scope="col">Released</th><th scope="col">Mean score</th><th scope="col">{overall ? 'Overall frontier' : 'Lab frontier'}</th></tr></thead>
        <tbody>
          {order.map((m) => <tr key={m.name}><td>{m.name}</td><td>{m.released}</td><td>{pct(m.score)}</td><td>{onFrontier.has(m.name) ? 'Yes' : 'No'}</td></tr>)}
        </tbody>
      </table></div>
    </figure>
  );
}
