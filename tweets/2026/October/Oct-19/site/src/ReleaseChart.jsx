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
import { LAB, VLA_LAB, LAB_NAME, MODELS, Marker, LogoMarker, LegendGlyph, glyph, LABEL_INK } from './robodojoModels.jsx';
import { useChartSize } from './useChartSize.js';
import { NARROW } from './ParetoChart.jsx';
import { placeLabels } from './placeLabels.js';

const day = (iso) => Date.parse(`${iso}T00:00:00Z`);
const X0 = day('2026-07-01'), X1 = day('2026-11-01');
const TODAY = day('2026-10-14');
const YMAX = 1; // full 0–100% scale (user 2026-09-30)
const X_TICKS = [['2026-07-01', 'Jul'], ['2026-08-01', 'Aug'], ['2026-09-01', 'Sep'], ['2026-10-01', 'Oct'], ['2026-11-01', 'Nov']];
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

// Label placement for this chart (the Astra pair shares a date).
const PLACE = {
  'GPT-5.6 Sol (high)': { dx: -6, dy: 22, anchor: 'start' },
  'GPT-6 Astra (high)': { dx: -12, dy: -6, anchor: 'end' },
  'GPT-6 Astra (medium)': { dx: -12, dy: 12, anchor: 'end' },
  'Opus 5.5 (high)': { dx: -10, dy: 4, anchor: 'end' },
  'Opus 5.5 (medium)': { dx: 10, dy: 16, anchor: 'start' },
  'GPT-6 Sol (high)': { dx: -10, dy: 18, anchor: 'end' },
  'GPT-6.1 Sol (high)': { dx: 0, dy: -18, anchor: 'end' },
  'Gemini 3.8 Flash (high)': { dx: -30, dy: 50, anchor: 'end' },
};

// The /draft/ X frame (`wide` at ~400px): the late-September cluster is
// tight, so its labels move clear of the markers and the riser.
const WIDE_PLACE = {
  'GPT-6.1 Sol (high)': { dx: 10, dy: -16, anchor: 'end' },
  'Opus 5.5 (high)': { dx: 0, dy: 19, anchor: 'middle' },
  'GPT-6 Sol (high)': { dx: -40, dy: 26, anchor: 'start' },
};

// Frontier models are always labelled; one without a hand-tuned spot (a new
// release, or the success metric) still gets a label up and to the left.
const DEFAULT_PLACE = { dx: -12, dy: -12, anchor: 'end' };

// Phone placement of the overall frontier's labels.
const NARROW_OVERALL_PLACE = {
  'GPT-5.6 Sol (high)': { dx: -8, dy: 24, anchor: 'start' },
  'Gemini 3.8 Flash (high)': { dx: -16, dy: 5, anchor: 'end' },
  'GPT-6 Astra (high)': { dx: -12, dy: -12, anchor: 'end' },
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
  const lab = Object.keys(LAB).map((l) => ({ lab: l, color: LAB[l], name: LAB_NAME[l], ...frontier(models.filter((m) => m.lab === l)) }));
  const overall = [{ lab: 'all', color: '#1B150F', name: 'Frontier', ...frontier(models) }];
  return { models, lab, overall, labOn: frontierSet(lab), overallOn: frontierSet(overall) };
};
// `metric="success"` plots each model's full-completion rate in place of
// mean task progress (the /draft/ success card, user 2026-10-07).
const METRICS = {
  progress: buildFrontiers(MODELS),
  success: buildFrontiers(MODELS.map((m) => ({ ...m, score: m.success }))),
};
const stepPath = (steps, x, y, TODAY) => {
  let d = '';
  steps.forEach((m, i) => { d += i === 0 ? `M${x(day(m.released))},${y(m.score)}` : `H${x(day(m.released))}V${y(m.score)}`; });
  return `${d}H${x(TODAY)}`;
};
const pct = (s) => `${(s * 100).toFixed(1)}%`;
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function ReleaseChart({ width = 720, height = 350, overall = false, logos = false, keepLabels = null, wide = false, colorLabels = false, sourceLink = true, caption = null, axisTitles = null, metric = 'progress', yMax = YMAX, yTicks = Y_TICKS, place = null, ariaLabel = null,
  // /draft/ Dream-1 Beta card (user 2026-10-18): own model list (adds VLAs) and a wider date range.
  models: modelsProp = null, x0 = X0, x1 = X1, xTicks = X_TICKS, today = TODAY,
  // fit (/draft/ Dream-1 card, user 2026-10-18): [{ name, test, color }], one least-squares line per group's frontier.
  fit = false,
  // hideLabels: names never labelled, even on the frontier (user 2026-10-18).
  hideLabels = null }) {
  const [plotRef, W, H] = useChartSize(width, height);
  const custom = React.useMemo(() => (modelsProp ? buildFrontiers(modelsProp) : null), [modelsProp]);
  const set = custom || METRICS[metric];
  const models = set.models;
  const FRONTIERS = overall ? set.overall : set.lab;
  const onFrontier = overall ? set.overallOn : set.labOn;
  // `wide` keeps the desktop labelling at any width (the /draft/ X frame).
  const narrow = !wide && W < NARROW;
  // The right margin holds the frontier-end lab names (no scores, user
  // 2026-10-02).
  // `axisTitles` ({ x, y }, the /draft/ X frame) adds room for Epoch-style
  // axis titles: y rotated in the left margin, x under the ticks.
  const M = { top: 14, right: narrow || wide ? 20 : 76, bottom: axisTitles ? 52 : 32, left: axisTitles ? 62 : 44 };
  const x = (t) => M.left + ((t - x0) / (x1 - x0)) * (W - M.left - M.right);
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
        <li><svg width="18" height="10" aria-hidden="true"><path d="M1 8H9V2H17" fill="none" stroke={INK} strokeWidth="2" /></svg>{overall ? 'Overall frontier' : 'Lab frontier'}</li>
        {fit && fit.map((g) => {
          const steps = frontier(models.filter(g.test)).steps;
          if (steps.length < 2) return null;
          const pts = steps.map((mm) => [day(mm.released), mm.score]);
          const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
          const b = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
          return <li key={g.name} style={{ color: g.color }}><svg width="22" height="10" aria-hidden="true"><line x1="0" y1="5" x2="22" y2="5" stroke={g.color} strokeWidth="2" strokeDasharray="5 3" /></svg>{g.name} fit +{(b * 30.44 * 864e5 * 100).toFixed(1)} pts/mo</li>;
        })}
      </ul>
      <div className="rc-chart-plot" ref={plotRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0}
          aria-label={ariaLabel || (overall ? "RoboDojo-RC Tier 1 mean score by model release date, July to September 2026, with the overall frontier: the best score released so far rises from GPT-5.6 Sol high (15%, July 9) to Gemini 3.8 Flash high (36%, September 2) and GPT-6 Astra high (43%, September 3). Use arrow keys to step through models." : "RoboDojo-RC Tier 1 mean score by model release date, July to September 2026. OpenAI's frontier rises from GPT-5.6 Sol high (15%, July 9) to GPT-6 Astra high (43%, September 3); Anthropic's Opus 5.5 high scores 38% (September 22). GPT-6 Sol high, released September 23, scores 22%. GPT-6.1 Sol high, released September 29, scores 42%. Gemini 3.8 Flash high, released September 2, scores 36%. Use arrow keys to step through models.")}
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />
              <text x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {xTicks.map(([iso, label], i) => (
            <text key={iso} x={x(day(iso))} y={H - M.bottom + 18} className="rc-chart-tick"
              textAnchor={narrow && i === xTicks.length - 1 ? 'end' : 'middle'}>{narrow ? label : overall ? `${label} ${iso.slice(0, 4)}` : `${label} ’26`}</text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />
          {axisTitles && <>
            <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" className="rc-chart-axistitle">{axisTitles.x}</text>
            <text transform={`translate(12 ${(M.top + H - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="middle" className="rc-chart-axistitle">{axisTitles.y}</text>
          </>}

          {fit && fit.map((g) => {
            // Least-squares line through group g's own release-date frontier (user 2026-10-18).
            const steps = frontier(models.filter(g.test)).steps;
            if (steps.length < 2) return null;
            const pts = steps.map((m) => [day(m.released), m.score]);
            const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
            const b = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
            const at = (t) => my + b * (t - mx);
            const ta = Math.max(x0, mx - my / b), tb = today;
            return (
              <g key={g.name}>
                <line x1={x(ta)} y1={y(at(ta))} x2={x(tb)} y2={y(at(tb))} stroke={g.color} strokeWidth={1.5} strokeDasharray="6 4" />
              </g>
            );
          })}
          {FRONTIERS.map((f) => (
            <path key={f.lab} d={stepPath(f.steps, x, y, today)} fill="none" stroke={f.color} strokeWidth={2} strokeLinejoin="round" opacity={0.75} />
          ))}
          {/* Frontier end labels: swatch in the lab colour, text in ink. */}
          {!narrow && !overall && FRONTIERS.map((f) => (
            <g key={f.lab} transform={`translate(${x(today)} ${y(f.end)})`}>
              {f.lab === 'google' && <line x1={0} y1={0} x2={6} y2={36} stroke={f.color} strokeWidth={0.8} opacity={0.6} />}
              <text x={8} y={f.lab === 'google' ? 36 : 0} dominantBaseline="middle" className="rc-chart-ratelab">{f.name}</text>
            </g>
          ))}

          {(overall ? [...models].sort((a, b) => onFrontier.has(a.name) - onFrontier.has(b.name)) : models).map((m) => {
            // The overall line runs along GPT-5.6 Sol's 15% under the Gemini
            // label's default spot, so there it sits beside the riser instead
            // (no leader).
            // With GPT-6 Astra (medium)'s label hidden (keepLabels), Gemini's can sit
            // level with its point.
            const p = place?.[m.name] || (overall && m.lab === 'google'
              ? (keepLabels && !keepLabels.includes('GPT-6 Astra (medium)') ? { dx: -16, dy: 5, anchor: 'end' } : { dx: -14, dy: 30, anchor: 'end' })
              : (wide && WIDE_PLACE[m.name]) || PLACE[m.name] || DEFAULT_PLACE);
            const front = onFrontier.has(m.name);
            const cx = x(day(m.released)), cy = y(m.score);
            // Overall views fade everything off the frontier so the frontier
            // models read at a glance (user 2026-10-05).
            return (
              <g key={m.name} opacity={overall && !front ? 0.7 : 1}>
                {!narrow && !overall && m.lab === 'google' && <line x1={cx} y1={cy} x2={cx + p.dx} y2={cy + p.dy - 10} stroke={(LAB[m.lab] || VLA_LAB[m.lab])} strokeWidth={0.8} opacity={0.6} />}
                <g opacity={overall && !front ? 0.45 : 1}>{logos
                  ? <LogoMarker lab={m.lab} cx={cx} cy={cy} big={front} ring={colorLabels ? LABEL_INK[m.lab] : undefined} />
                  : <Marker kind={glyph(m.name)} cx={cx} cy={cy} color={(LAB[m.lab] || VLA_LAB[m.lab])} big={front} />}</g>
                {!narrow && !hideLabels?.includes(m.name) && (!keepLabels || front || keepLabels.includes(m.name)) && <text x={cx + p.dx} y={cy + p.dy} textAnchor={p.anchor} className={front ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'} style={colorLabels && front && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>{m.name}</text>}
              </g>
            );
          })}

          {narrowLabels.map((l) => {
            const m = models.find((mm) => mm.name === l.key);
            return (
              <g key={l.key}>
                <line {...l.leader} stroke={(LAB[m.lab] || VLA_LAB[m.lab])} strokeWidth={1.25} opacity={0.85} />
                <text x={l.x} y={l.y} textAnchor={l.anchor} className="rc-chart-label rc-chart-label-strong" style={colorLabels && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>
                  {l.lines.map((t, i) => <tspan key={i} x={l.x} dy={i ? 14 : 0}>{t}</tspan>)}
                </text>
              </g>
            );
          })}

          {hover && <circle cx={hx} cy={hy} r={logos ? 16 : 10} fill="none" stroke={(LAB[hover.lab] || VLA_LAB[hover.lab])} strokeWidth={1.5} pointerEvents="none" />}
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
        {caption || <>Mean score over 120 task attempts per configuration, by public release date.{sourceLink && <> Source: <a href={PARETO_RUNS}>All runs</a>.</>}</>}
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
