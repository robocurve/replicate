/* LLM inference speed over time — native SVG chart for the first
   leaderboard panel. Data: assets/data/llm-speed.json, exported from
   robocurve/llm-token-speed (same tiers, frontier and rate maths as its
   make_speed_chart.py; Artificial Analysis API snapshot 2026-08-20 plus
   models added through 2026-10-17, via its src/export_web_json.py).

   Dots are models (median output tok/s at release), coloured by
   intelligence level; the step line per level traces its speed frontier
   (every model faster than all earlier releases in that level) out to the
   snapshot date, labelled at its end with the annualised frontier growth.
   Hover (or focus + arrows) shows the nearest model. Palette checked with
   the dataviz validator against the panel surface: the grey level is a
   deliberate recessive neutral (chroma-floor flag accepted, contrast
   passes, every level is also direct-labelled).

   Laid out at the container's real width (useChartSize); below NARROW px
   the line-end labels move into the legend so the plot keeps its width. */

import React from 'react';
import DATA from '../assets/data/llm-speed.json';
import { useChartSize } from './useChartSize.js';
import { NARROW } from './ParetoChart.jsx';

const COLORS = { 'GPT-3.5 Turbo': '#7D8990', o1: '#A34E30', 'GPT-5': '#B8860B', 'Fable 5': '#0679A9' };
// AA Intelligence Index bands per level (lo inclusive, hi exclusive), as in
// llm-token-speed's TIERS.
const BANDS = { 'GPT-3.5 Turbo': 'AA 0–20', o1: 'AA 20–35', 'GPT-5': 'AA 35–50', 'Fable 5': 'AA 50+' };
const X0 = Date.UTC(2024, 0, 1), X1 = Date.parse(`${DATA.snapshot}T00:00:00Z`) + 20 * 864e5;
const Y0 = 10, Y1 = 2500;
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
const SNAP = t(DATA.snapshot);
const Y_TICKS = [10, 20, 50, 100, 200, 500, 1000, 2000];
const X_TICKS = [[2024, 0], [2024, 6], [2025, 0], [2025, 6], [2026, 0], [2026, 6]].map(([yr, mo]) => ({
  t: Date.UTC(yr, mo, 1), label: `${mo === 0 ? 'Jan' : 'Jul'} ’${String(yr).slice(2)}`,
}));
const fmtSpeed = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(0));
const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const RATE = Object.fromEntries(DATA.tiers.map((tier) => [tier.label, `×${tier.rate}/${tier.unit}`]));

// Every plotted point, for hover lookup (frontier first so ties prefer it).
const pointsAt = (x, y) => DATA.tiers.flatMap((tier) => [
  ...tier.frontier.map(([name, d, s]) => ({ name, d, s, tier: tier.label, frontier: true })),
  ...tier.rest.map(([name, d, s]) => ({ name, d, s, tier: tier.label, frontier: false })),
]).filter((p) => t(p.d) >= X0).map((p) => ({ ...p, px: x(t(p.d)), py: y(p.s) }));

// End-of-line labels, nudged apart so close finishes (GPT-5 vs Fable 5)
// never overlap: sort by y, then push each at least 16px below the last.
const labelsAt = (y) => {
  const ls = DATA.tiers.map((tier) => {
    const last = tier.frontier[tier.frontier.length - 1];
    return { tier: tier.label, rate: RATE[tier.label], y0: y(last[2]) };
  }).sort((a, b) => a.y0 - b.y0);
  ls.forEach((l, i) => { l.y = i === 0 ? l.y0 : Math.max(l.y0, ls[i - 1].y + 16); });
  return ls;
};

function stepPath(frontier, x, y) {
  let d = '';
  frontier.forEach(([, iso, s], i) => {
    const px = x(t(iso)), py = y(s);
    d += i === 0 ? `M${px},${py}` : `H${px}V${py}`;
  });
  return `${d}H${x(SNAP)}`;
}

export function SpeedChart({ width = 720, height = 350 }) {
  const [plotRef, W, H] = useChartSize(width, height);
  const narrow = W < NARROW;
  // The right margin holds the line-end labels ("×2.1/mo Fable 5").
  const M = { top: 10, right: narrow ? 16 : 132, bottom: 30, left: 44 };
  const x = (tt) => M.left + ((tt - X0) / (X1 - X0)) * (W - M.left - M.right);
  const y = (v) => M.top + (1 - (Math.log(v) - Math.log(Y0)) / (Math.log(Y1) - Math.log(Y0))) * (H - M.top - M.bottom);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- x/y depend only on W, H, narrow
  const POINTS = React.useMemo(() => pointsAt(x, y), [W, H, narrow]);
  const LABELS = narrow ? [] : labelsAt(y);
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const pick = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
    let best = null, bd = 18 * 18; // hit radius 18 viewBox px — bigger than the marks
    for (const p of POINTS) {
      const dd = (p.px - mx) ** 2 + (p.py - my) ** 2;
      if (dd < bd || (dd === bd && p.frontier)) { bd = dd; best = p; }
    }
    setHover(best);
  };
  // Keyboard: arrows walk the frontier models in date order.
  const FRONT = React.useMemo(() => POINTS.filter((p) => p.frontier).sort((a, b) => a.px - b.px), [POINTS]);
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = hover ? FRONT.indexOf(hover) : -1;
    const n = e.key === 'ArrowRight' ? Math.min(FRONT.length - 1, i + 1) : Math.max(0, i < 0 ? FRONT.length - 1 : i - 1);
    setHover(FRONT[n]);
  };

  const tipLeft = hover && hover.px > W * 0.6;
  return (
    <figure className="rc-chart">
      <ul className="rc-chart-legend" aria-label="Intelligence level (Artificial Analysis index)">
        {DATA.tiers.map((tier) => (
          <li key={tier.label}><span className="rc-chart-swatch" style={{ background: COLORS[tier.label] }} aria-hidden="true" />{tier.label}-level <span className="rc-chart-band">({BANDS[tier.label]})</span><span className="rc-chart-legend-rate"> {RATE[tier.label]}</span></li>
        ))}
      </ul>
      <div className="rc-chart-plot" ref={plotRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0}
          aria-label="Scatter of LLM output speed by release date, January 2024 to October 2026, log scale. Frontier speed grows about 2.3× a year at GPT-3.5 level, 7.8× at o1 level, 3.4× at GPT-5 level, and 2.1× a month at Fable 5 level. Use arrow keys to step through frontier models."
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          <defs>
            <clipPath id="rc-chart-clip"><rect x={M.left} y={M.top - 6} width={W - M.left - M.right + 1} height={H - M.top - M.bottom + 12} /></clipPath>
          </defs>
          {/* Recessive grid + axes */}
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />
              <text x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{v.toLocaleString('en-US')}</text>
            </g>
          ))}
          {X_TICKS.map((tk) => (
            <text key={tk.t} x={x(tk.t)} y={H - M.bottom + 18} className="rc-chart-tick" textAnchor="middle">{tk.label}</text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />

          <g clipPath="url(#rc-chart-clip)">
            {/* Non-frontier models: faint dots */}
            {DATA.tiers.map((tier) => (
              <g key={tier.label} fill={COLORS[tier.label]} opacity={tier.label === 'GPT-3.5 Turbo' ? 0.2 : 0.28}>
                {tier.rest.map(([name, iso, s]) => <circle key={name + iso} cx={x(t(iso))} cy={y(s)} r={2.6} />)}
              </g>
            ))}
            {/* Frontier step lines + markers (2px surface ring) */}
            {DATA.tiers.map((tier) => (
              <g key={tier.label}>
                <path d={stepPath(tier.frontier, x, y)} fill="none" stroke={COLORS[tier.label]} strokeWidth={2} strokeLinejoin="round" opacity={0.85} />
                {tier.frontier.map(([name, iso, s]) => (
                  <circle key={name} cx={x(t(iso))} cy={y(s)} r={4.5} fill={COLORS[tier.label]} stroke="var(--surface-float)" strokeWidth={2} />
                ))}
              </g>
            ))}
          </g>

          {/* Direct labels at each line's end: swatch in the series colour,
             text in ink. */}
          {LABELS.map((l) => (
            <g key={l.tier} transform={`translate(${x(SNAP) + 8} ${l.y})`}>
              {Math.abs(l.y - l.y0) > 1 && <line x1={-8} x2={-8} y1={l.y0 - l.y} y2={0} stroke={COLORS[l.tier]} strokeWidth={1} />}
              <rect x={-8} y={-1} width={16} height={2} rx={1} fill={COLORS[l.tier]} />
              <text x={12} y={0} dominantBaseline="middle" className="rc-chart-rate">{l.rate}</text>
              <text x={12 + l.rate.length * 7.4 + 4} y={0} dominantBaseline="middle" className="rc-chart-ratelab">{l.tier === 'GPT-3.5 Turbo' ? 'GPT-3.5' : l.tier}</text>
            </g>
          ))}

          {hover && (
            <g pointerEvents="none">
              <line x1={hover.px} x2={hover.px} y1={M.top} y2={H - M.bottom} className="rc-chart-cross" />
              <circle cx={hover.px} cy={hover.py} r={6.5} fill={COLORS[hover.tier]} stroke="var(--surface-float)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover && (
          <div className="rc-chart-tip" role="status" style={{
            left: `${(hover.px / W) * 100}%`, top: `${(hover.py / H) * 100}%`,
            transform: `translate(${tipLeft ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
          }}>
            <strong>{hover.name}</strong>
            <span><span className="rc-chart-swatch" style={{ background: COLORS[hover.tier] }} aria-hidden="true" />{hover.tier}-level ({BANDS[hover.tier]}){hover.frontier ? ' · frontier' : ''}</span>
            <span>{fmtSpeed(hover.s)} tok/s · {fmtDate(hover.d)}</span>
          </div>
        )}
      </div>
      <figcaption className="rc-chart-cap">
        Median output tokens/s at release, log scale. Source: <a href="https://github.com/robocurve/llm-token-speed" target="_blank" rel="noopener noreferrer">Robocurve analysis</a> of Artificial Analysis data.
      </figcaption>
      {/* Table view of the frontier for screen readers. */}
      <div className="rc-sr-only"><table>
        <caption>Frontier models by intelligence level</caption>
        <thead><tr><th scope="col">Level</th><th scope="col">Model</th><th scope="col">Released</th><th scope="col">Tokens/s</th></tr></thead>
        <tbody>
          {DATA.tiers.flatMap((tier) => tier.frontier.map(([name, iso, s]) => (
            <tr key={tier.label + name}><td>{tier.label}</td><td>{name}</td><td>{iso}</td><td>{fmtSpeed(s)}</td></tr>
          )))}
        </tbody>
      </table></div>
    </figure>
  );
}
