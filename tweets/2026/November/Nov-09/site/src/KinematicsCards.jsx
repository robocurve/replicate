/* /draft/ — Franka Panda kinematics cards (user 2026-11-09): Aiden Swann's four no-reasoning tests
   (forward kinematics, multiple choice, inverse kinematics, changed DH table) against Epoch's ECI.
   Trend + "95% of other models" band are fitted WITHOUT GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon,
   so the cards show whether those three are outliers for their general capability.

   Data: social/posts/2026-11-08-yam-kinematics/draft/eci/export_cards.py -> kinematicsData.json
   (Panda results: our harness for 12 models, Aiden's released numbers for the rest). */

import { LogoMarker, LAB, LABEL_INK } from './robodojoModels.jsx';
import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { useChartSize } from './useChartSize.js';
import { Wordmark } from './components/Wordmark.jsx';
import DATA from './kinematicsData.json';

const HALO = { paintOrder: 'stroke', stroke: 'var(--surface-page, #FBFAF6)', strokeWidth: 4, strokeLinejoin: 'round' };
const MB = { top: 10, right: 14, bottom: 40, left: 44 };
const X = { min: 126, max: 171, ticks: [130, 140, 150, 160, 170] };
const OTHER = '#9A968C';
// One colour per leader (user 2026-11-09): Astra and Sol share OpenAI's ink otherwise.
const LEADER_INK = { 'GPT-6 Astra': '#1B150F', 'GPT-6.1 Sol': '#2E6DB4', 'Gemini 4 Argon': '#1F6B36' };
const inkOf = (p) => LEADER_INK[p.name] ?? LABEL_INK[p.lab];
const BAND = '#6B6A66'; // neutral: lab blue is OpenAI's dot colour

// Leader labels stacked to the left of the top-right cluster, joined by thin grey leader lines
// (feedback: connectors neutral grey, diagonal).
const LABEL_Y = { 'GPT-6 Astra': 0, 'GPT-6.1 Sol': 1, 'Gemini 4 Argon': 2 };

function Card({ k, yMin, yMax, yTicks, yTitle, yFmt = (v) => v, labelAt, topTitle = false, rankDir = 'below', showRank = true, metric = 'IK error', better = null, noCaption = false, plainDots = false, noLabels = false, chance = null, hint = null }) {
  const d = DATA[k];
  const [plotRef, W, H] = useChartSize(380, 330);
  // topTitle: y-axis title as a horizontal line above the plot instead of rotated (user 2026-11-09).
  const M = topTitle ? { ...MB, top: MB.top + 24, left: MB.left - 14 + (better ? 30 : 0) } : MB;
  const x = (v) => M.left + ((v - X.min) / (X.max - X.min)) * (W - M.left - M.right);
  const y = (v) => M.top + (1 - (Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
  const path = (pts) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
  const band = path(d.curve.map(([a], i) => [a, d.hi[i]])) + ' ' +
    d.curve.slice().reverse().map(([a], i) => `L${x(a).toFixed(1)},${y(d.lo[d.lo.length - 1 - i]).toFixed(1)}`).join(' ') + ' Z';
  const others = d.points.filter((p) => !p.leader);
  // Labels follow the points' vertical order (top label = highest point) so leader lines don't cross.
  const leaders = d.points.filter((p) => p.leader).sort((a, b) => b.v - a.v);
  return (
    <figure className="rc-chart">
      <div className="rc-chart-plot" ref={plotRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`${yTitle} against Epoch Capabilities Index for ${d.n} models on the Franka Panda, no reasoning. Trend fitted to ${d.n_fit} models without GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon. Their ranks against the trend: ${leaders.map((p) => `${p.name} ${p.rank} of ${d.n}`).join(', ')}.`}>
          {yTicks.map((v) => <line key={`gy${v}`} x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />)}
          {X.ticks.map((v) => <line key={`gx${v}`} x1={x(v)} x2={x(v)} y1={M.top} y2={H - M.bottom} className="rc-chart-grid" />)}
          {yTicks.map((v) => <text key={`ty${v}`} x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{yFmt(v)}</text>)}
          {X.ticks.map((v) => <text key={`tx${v}`} x={x(v)} y={H - M.bottom + 18} className="rc-chart-tick" textAnchor="middle">{v}</text>)}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />
          <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="rc-chart-axistitle">General AI capability (Epoch's ECI)</text>
          {topTitle
            ? <text x={4} y={12} textAnchor="start" className="rc-chart-axistitle">{yTitle}{hint && <tspan dx={10}>{hint}</tspan>}</text>
            : <text transform={`translate(12 ${(M.top + H - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="rc-chart-axistitle">{yTitle}</text>}

          <path d={band} fill={BAND} opacity={0.12} />
          {chance != null && ( /* chance line (user 2026-11-09) */
            <g>
              <line x1={M.left} x2={W - M.right} y1={y(chance)} y2={y(chance)} stroke="#6B6A66" strokeWidth={1} strokeDasharray="4 3" />
              <text x={W - M.right - 2} y={y(chance) - 5} textAnchor="end" className="rc-chart-tick">chance</text>
            </g>
          )}
          {/* Direction-of-better arrow, parallel to the y-axis (user 2026-11-09). */}
          {better && (() => {
            // Outside the plot, left of the y-axis tick labels (user 2026-11-09).
            const ax = 24, y0 = y(better.from), y1 = y(better.to), dir = Math.sign(y1 - y0);
            return (
              <g>
                <line x1={ax} x2={ax} y1={y0} y2={y1 - dir * 7} stroke="#52514E" strokeWidth={1.75} />
                <path d={`M${ax - 5},${y1 - dir * 8} L${ax},${y1} L${ax + 5},${y1 - dir * 8} Z`} fill="#52514E" />
                <text transform={`translate(${ax - 14} ${(y0 + y1) / 2}) rotate(-90)`} textAnchor="middle" dominantBaseline="middle"
                  className="rc-chart-label rc-chart-label-strong" style={{ fill: '#52514E' }}>Better robotics skills</text>
              </g>
            );
          })()}
          <path d={path(d.curve)} fill="none" stroke={BAND} strokeWidth={1.75} opacity={0.6} />

          {others.map((p) => (
            <circle key={p.name} cx={x(p.eci)} cy={y(p.v)} r={3.6} fill={OTHER} opacity={0.7} /* all other models grey: highlight the three, grey the rest (user 2026-11-09) */
              stroke="var(--surface-page, #FBFAF6)" strokeWidth={1} />
          ))}
          {!noLabels && leaders.map((p, i) => {
            const [lx, ly] = labelAt(i, x, y, p.name);
            return (
              <g key={p.name}>
                <line x1={x(p.eci)} y1={y(p.v)} x2={lx + 4} y2={ly} stroke="#9A968C" strokeWidth={0.8} />
                <text x={lx} y={ly} textAnchor="end" dominantBaseline="middle" className="rc-chart-label rc-chart-label-strong"
                  style={{ ...HALO, fill: inkOf(p) }}>{showRank ? `${p.name} · #${p.rank} of ${d.n}` : p.name}</text>
              </g>
            );
          })}
          {leaders.map((p) => (plainDots // pair cards: coloured dots leave room for the arrows (user 2026-11-09)
            ? <circle key={`m${p.name}`} cx={x(p.eci)} cy={y(p.v)} r={4.5} fill={inkOf(p)} stroke="#FCFCFB" strokeWidth={1} />
            : <LogoMarker key={`m${p.name}`} lab={p.lab} cx={x(p.eci)} cy={y(p.v)} big={false} ring={inkOf(p)} />))}
          {leaders.map((p) => <circle key={`a${p.name}`} data-anchor-l={p.name} data-ink={inkOf(p)} cx={x(p.eci)} cy={y(p.v)} r={0} />)}
        </svg>
      </div>
      {!noCaption && <figcaption className="rc-chart-cap">
        N={d.n} LLMs. {metric} data from Aiden Swann (2026). The grey curve is fitted to all models while leaving out GPT-6 Astra,
        GPT-6.1 Sol and Gemini 4 Argon. The band is fitted to cover 95% of the models.{showRank && <> #N ranks all {d.n} by how far {rankDir} the curve they land; #1 is farthest.</>}
      </figcaption>}
    </figure>
  );
}

// Labels stacked in the open area left of the cluster, top to bottom (ys given high to low).
const stack = (ex, ys) => (i, x, y) => [x(ex), y([...ys].sort((a, b) => b - a)[i])];

export const KINEMATICS_PANELS = [
  { id: 'kin-fk', title: 'Panda forward kinematics: the top three sit at the edge of the capability trend',
    chart: () => <Card k="fk" metric="FK error" yMin={0} yMax={100} yTicks={[0, 20, 40, 60, 80, 100]} yTitle="Hand-position error (cm), lower is better"
      labelAt={stack(161, [4, 12, 20])} /> },
  { id: 'kin-mc', title: 'Panda multiple choice: the top three sit at the edge of the capability trend',
    chart: () => <Card k="mc" chance={25} metric="Multiple-choice" rankDir="above" yMin={0} yMax={100} yTicks={[0, 25, 50, 75, 100]} yTitle="Correct (%)"
      labelAt={stack(161, [98, 90, 82])} /> },
  { id: 'kin-ik', title: 'General AI capability largely predicts LLMs\' robotics skills on the Franka Panda',
    chart: () => <Card k="ik" topTitle showRank={false} yMin={-12} yMax={150} yTicks={[0, 50, 100, 150]} yTitle="IK error on the Franka Panda (cm, lower is better)"
      labelAt={(i, x, y, name) => (name === 'GPT-6.1 Sol' ? [x(166.5), y(40)] // from above (user 2026-11-09)
        : [x(160), y(name === 'Gemini 4 Argon' ? 3 : -6)])} /> },
  { id: 'kin-twist', title: 'Changed Panda table: copying grows with capability, the top three included',
    chart: () => <Card k="twist" metric="Changed-table" yMin={0} yMax={90} yTicks={[0, 30, 60, 90]} yTitle="Distance from the real Panda's answer (cm)"
      labelAt={stack(161, [4, 11, 18])} /> },
];

// ---- Ranking cards (user 2026-11-09): Plot 2a on the Panda, one card per test ---------------------------
// Top 10 models by how far they beat their ECI trend (trend fitted without the three leaders), plus the three
// leaders wherever they rank; "⋯" marks skipped ranks.
const LEADER_SET = new Set(['GPT-6 Astra', 'GPT-6.1 Sol', 'Gemini 4 Argon']);

function RankCard({ k, unit, xTitle, noCaption = false, rankOnly = false, topN: topNIn = 0, compact = false, hint = null }) {
  let topN = topNIn;
  const d = DATA[k];
  // All models, ranked; the three leaders get a shaded row and a name (user 2026-11-09: no logos).
  // topN (user 2026-11-09): only the top N plus the three leaders, with a ⋯ row wherever ranks are skipped.
  const ranked = [...d.points].sort((a, b) => a.rank - b.rank);
  if (topN < 0) { // -N: show N rows in total, i.e. the top k plus any leaders below k (user 2026-11-09: 15 rows on the 5:4 card)
    const total = -topN;
    let k = total;
    while (k > 0 && k + ranked.filter((p) => p.rank > k && LEADER_SET.has(p.name)).length > total) k -= 1;
    topN = k;
  }
  const rows = [];
  (topN ? ranked.filter((p) => p.rank <= topN || LEADER_SET.has(p.name)) : ranked).forEach((p) => {
    const prev = rows[rows.length - 1];
    if (topN && prev && p.rank - prev.rank > 1) rows.push({ gap: true, name: `gap${p.rank}` });
    rows.push(p);
  });
  const pts = rows.filter((p) => !p.gap);
  const [plotRef, W, H] = useChartSize(380, 330);
  const lo = Math.min(0, ...pts.map((p) => p.res)), hi = Math.max(0, ...pts.map((p) => p.res));
  const RM = { top: 26, right: 74, bottom: 30, left: rankOnly ? (topN ? (compact ? 150 : 160) : 44) : 150 };
  if (compact) { // mobile: values without the unit; name column sized to the longest label shown
    RM.right = 36;
    if (topN) RM.left = Math.ceil(Math.max(...pts.map((p) => `#${p.rank} ${p.name}`.length * (LEADER_SET.has(p.name) ? 7 : 6.5)))) + 14;
  }
  // Domain rounds to 10; labelled ticks use the smallest round step that keeps them >= 44px apart at this width.
  const plotW = W - RM.left - RM.right;
  const d0 = Math.floor(lo / 10) * 10, d1 = Math.ceil(hi / 10) * 10;
  const step = [10, 20, 25, 50, 100].find((st) => (plotW * st) / (d1 - d0) >= (compact ? 32 : 44)) ?? 100;
  const ticks = [];
  for (let v = Math.ceil(d0 / step) * step; v <= d1; v += step) ticks.push(v);
  const x = (v) => RM.left + ((v - d0) / (d1 - d0)) * plotW;
  // ⋯ rows take half a row so short ranked lists stay tall enough for 12px labels.
  const units = rows.map((r) => (r.gap ? 0.7 : 1));
  const unitH = (H - RM.top - RM.bottom) / units.reduce((a, b) => a + b, 0);
  const rowH = unitH;
  const cum = units.reduce((a, u, i) => { a.push((a[i - 1] ?? 0) + u); return a; }, []);
  const yr = (i) => RM.top + unitH * (cum[i] - units[i] / 2);
  const leaders = rows.map((p, i) => [p, i]).filter(([p]) => !p.gap && LEADER_SET.has(p.name));
  const band = Math.min(Math.max(rowH * 0.9, 16), 26); // Plot 2's neutral shade (#f0eee6, 0.9 row)
  const ly = leaders.map(([, i]) => yr(i)); // label y, pushed apart so adjacent ranks stay legible
  for (let it = 0; it < 20; it++) for (let j = 1; j < ly.length; j++) {
    const gap = ly[j] - ly[j - 1];
    if (gap < 18) { const d = (18 - gap) / 2; ly[j - 1] -= d; ly[j] += d; }
  }
  return (
    <figure className="rc-chart">
      <div className="rc-chart-plot" ref={plotRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`${xTitle}: all ${d.n} models ranked. ${leaders.map(([p]) => `${p.rank}. ${p.name} ${p.res > 0 ? '+' : ''}${p.res.toFixed(1)}`).join('; ')}.`}>
          <text x={4} y={12} textAnchor="start" className="rc-chart-axistitle">{xTitle}{hint && <tspan dx={10}>{hint}</tspan>}</text>{/* user 2026-11-09 */}
          {leaders.map(([p, i]) => (
            <rect key={`s${p.name}`} x={0} width={W} y={yr(i) - band / 2} height={band} fill="#f0eee6" />
          ))}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={RM.top} y2={H - RM.bottom} className="rc-chart-grid" />
              <text x={x(v)} y={H - RM.bottom + 18} className="rc-chart-tick" textAnchor="middle">{v > 0 ? `+${v}` : v < 0 ? `−${-v}` : 0}</text>
            </g>
          ))}
          <line x1={x(0)} x2={x(0)} y1={RM.top} y2={H - RM.bottom} stroke="#52514E" strokeWidth={1} />
          {(topN ? [] : [1, d.n]).filter((r) => !leaders.some(([p]) => Math.abs(p.rank - r) <= 2)).map((r) => (
            <text key={`r${r}`} x={rankOnly ? 8 : RM.left - 10} y={yr(r - 1)} textAnchor={rankOnly ? 'start' : 'end'} dominantBaseline="middle" className="rc-chart-tick">#{r}</text>
          ))}
          {rows.map((p, i) => {
            if (p.gap) return <text key={p.name} x={rankOnly ? 8 : RM.left - 10} y={yr(i)} textAnchor={rankOnly ? 'start' : 'end'} dominantBaseline="middle" className="rc-chart-tick">⋯</text>;
            const lead = LEADER_SET.has(p.name);
            const ink = lead ? inkOf(p) : OTHER;
            return (
              <g key={p.name}>
                <line x1={x(0)} x2={x(p.res)} y1={yr(i)} y2={yr(i)} stroke={ink} strokeWidth={lead ? 2 : 1.5} opacity={lead ? 0.9 : 0.5} />
                <circle cx={x(p.res)} cy={yr(i)} r={lead ? 4 : topN ? 3.5 : 2.5} fill={ink} opacity={lead ? 1 : 0.7} />
                {topN > 0 && !lead && (
                  <text x={rankOnly ? 8 : RM.left - 10} y={yr(i)} textAnchor={rankOnly ? 'start' : 'end'} dominantBaseline="middle" className="rc-chart-label" style={{ fill: '#52514E' }}>
                    #{p.rank} {p.name}
                  </text>
                )}
              </g>
            );
          })}
          {leaders.map(([p, i], j) => (
            <g key={`l${p.name}`}>
              <text x={rankOnly ? 8 : RM.left - 10} y={ly[j]} data-anchor-r={p.name} textAnchor={rankOnly ? 'start' : 'end'} dominantBaseline="middle"
                className="rc-chart-label rc-chart-label-strong" style={{ ...(rankOnly && !topN ? HALO : {}), fill: inkOf(p) }}>#{p.rank} {p.name}</text>
              <text x={W - 2} y={ly[j]} textAnchor="end" dominantBaseline="middle" className="rc-chart-tick" style={{ fill: inkOf(p) }}>
                {p.res > 0 ? '+' : p.res < 0 ? '−' : ''}{Math.abs(p.res).toFixed(1)}{compact ? '' : unit}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {!noCaption && <figcaption className="rc-chart-cap">
        N={d.n} LLMs, Franka Panda, data from Aiden Swann (2026). Each model's score minus the grey trend from the
        matching card (fitted to all models while leaving out GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon), all models ranked.
      </figcaption>}
    </figure>
  );
}

export const KIN_RANK_PANELS = [
  { id: 'kr-fk', title: 'Panda forward kinematics: which LLMs beat their general-capability trend most',
    chart: () => <RankCard k="fk" unit=" cm" xTitle="Hand-position error below predicted (cm)" /> },
  { id: 'kr-mc', title: 'Panda multiple choice: which LLMs beat their general-capability trend most',
    chart: () => <RankCard k="mc" unit=" pts" xTitle="Correct above predicted (points)" /> },
  { id: 'kr-ik', title: 'Panda inverse kinematics: which LLMs beat their general-capability trend most',
    chart: () => <RankCard k="ik" unit=" cm" xTitle="IK error below predicted (cm)" /> },
  { id: 'kr-twist', title: 'Changed Panda table: which LLMs copy the real Panda more than their capability predicts',
    chart: () => <RankCard k="twist" unit=" cm" xTitle="Distance from the real Panda's answer, below predicted (cm)" /> },
];

// ---- 16:9 pair cards (user 2026-11-09): scatter (15a-d) left, ranking (2a1-2a4) right, one caption. ----------
const PAIR_CAP = (metric, topN, u) => <>N=44 LLMs, Franka Panda, {metric} data from Aiden Swann (2026). Left: the grey curve is fitted to all models
  while leaving out GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon; the band covers 95% of those models. Right: each model's
  distance from that curve ({u}), {topN ? `top ${topN} models shown, plus those three` : 'all models ranked'}.</>;
// Grey arrows from each leader on the scatter to its row in the ranking (user 2026-11-09). Measured from the DOM
// because the two charts are separate SVGs.
function PairArrows({ boxRef }) {
  const [arrows, setArrows] = useState([]);
  useEffect(() => { // not layout effect: the parent div's ref attaches after child layout effects
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => {
      const o = box.getBoundingClientRect();
      const c = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - o.left, r.top + r.height / 2 - o.top]; };
      const out = [];
      box.querySelectorAll('[data-anchor-l]').forEach((l) => {
        const r = box.querySelector(`[data-anchor-r="${l.getAttribute('data-anchor-l')}"]`);
        if (r) { // end at the left edge of the ranking svg, level with the model's label
          const sb = r.ownerSVGElement.getBoundingClientRect();
          out.push({ k: l.getAttribute('data-anchor-l'), ink: l.getAttribute('data-ink'), a: c(l), b: [sb.left - o.left, c(r)[1]] });
        }
      });
      setArrows(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    const mo = new MutationObserver(measure); // charts re-render after their own size measurement
    mo.observe(box, { subtree: true, childList: true, attributes: true, attributeFilter: ['cx', 'cy', 'viewBox'] });
    const ts = [100, 400, 1000].map((ms) => setTimeout(measure, ms));
    return () => { ro.disconnect(); mo.disconnect(); ts.forEach(clearTimeout); };
  }, [boxRef]);
  const uid = useId().replace(/:/g, '');
  // Elbow connectors (user 2026-11-09): 90-degree turns, no crossings, never through a logo. Each arrow leaves its
  // own logo from the right, top or bottom; we try every combination and keep the shortest valid one.
  const n = arrows.length;
  const R = 6; // dot radius + margin
  const x2 = n ? Math.min(...arrows.map(({ b }) => b[0])) - 3 : 0;
  const routes = (() => {
    if (!n) return [];
    const L = arrows.map(({ a }) => a);
    const yT = Math.min(...L.map((q) => q[1])) - R, yB = Math.max(...L.map((q) => q[1])) + R;
    const xR = Math.max(...L.map((q) => q[0])) + R, xL = Math.min(...L.map((q) => q[0])) - R;
    const byEnd = arrows.map((r, j) => [r.b[1], j]).sort((p, q) => p[0] - q[0]).map(([, j]) => j);
    const gap = Math.min(10, (x2 - xR - 26) / Math.max(1, n - 1));
    const chan = (j) => xR + 12 + byEnd.indexOf(j) * gap;
    const segs = (pts) => pts.slice(1).map((q, i) => [pts[i], q]);
    const hitsCircle = ([p, q], c) => { // distance from circle centre to an axis-aligned segment
      const cx = Math.max(Math.min(c[0], Math.max(p[0], q[0])), Math.min(p[0], q[0]));
      const cy = Math.max(Math.min(c[1], Math.max(p[1], q[1])), Math.min(p[1], q[1]));
      return Math.hypot(c[0] - cx, c[1] - cy) < R - 0.5;
    };
    const cross = ([p, q], [u, v]) => {
      const h1 = p[1] === q[1], h2 = u[1] === v[1];
      const inR = (t, m, n2) => t > Math.min(m, n2) + 0.5 && t < Math.max(m, n2) - 0.5;
      if (h1 && h2) return Math.abs(p[1] - u[1]) < 6 && Math.min(Math.max(p[0], q[0]), Math.max(u[0], v[0])) > Math.max(Math.min(p[0], q[0]), Math.min(u[0], v[0]));
      if (!h1 && !h2) return Math.abs(p[0] - u[0]) < 6 && Math.min(Math.max(p[1], q[1]), Math.max(u[1], v[1])) > Math.max(Math.min(p[1], q[1]), Math.min(u[1], v[1]));
      const [H, V] = h1 ? [[p, q], [u, v]] : [[u, v], [p, q]];
      return inR(V[0][0], H[0][0], H[1][0]) && inR(H[0][1], V[0][1], V[1][1]);
    };
    const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((v, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [v, ...r])));
    let best = null;
    for (const perm of perms(arrows.map((_, j) => j))) for (let combo = 0; combo < 7 ** n; combo++) {
      // 0 right; 1 top; 2 bottom; 3/4 left (near/far side of the cluster) then over the top; 5/6 the same under the bottom
      const exit = arrows.map((_, j) => Math.floor(combo / 7 ** j) % 7);
      const riserX = (j) => ([3, 5].includes(exit[j]) ? L[j][0] - R - 6 : [4, 6].includes(exit[j]) ? xL - 4 : L[j][0]);
      const top = arrows.map((_, j) => j).filter((j) => [1, 3, 4].includes(exit[j]));
      const bot = arrows.map((_, j) => j).filter((j) => [2, 5, 6].includes(exit[j]));
      for (const tp of perms(top)) for (const bp of perms(bot)) { // every lane order
      const lane = {};
      tp.forEach((j, k) => { lane[j] = yT - 8 - k * 7; });
      bp.forEach((j, k) => { lane[j] = yB + 8 + k * 7; });
      const paths = arrows.map(({ a: [lx, ly], b: [, ey] }, j) => {
        const c = xR + 12 + perm.indexOf(j) * gap;
        if (exit[j] === 0) return [[lx + R, ly], [c, ly], [c, ey], [x2, ey]];
        if (exit[j] >= 3) return [[lx - R, ly], [riserX(j), ly], [riserX(j), lane[j]], [c, lane[j]], [c, ey], [x2, ey]];
        const sy = exit[j] === 1 ? ly - R : ly + R;
        return [[lx, sy], [lx, lane[j]], [c, lane[j]], [c, ey], [x2, ey]];
      });
      const S = paths.map(segs);
      if (exit.some((e) => e >= 3)) continue; // user 2026-11-09: stay on the right; bridge a crossing instead of detouring left
      let ok = true, nCross = 0;
      const over = arrows.map(() => 0); // crossings where this arrow is the vertical one (drawn on top, bridged)
      for (let j = 0; ok && j < n; j++) for (let i = 0; ok && i < n; i++) {
        if (S[j].some((sg) => hitsCircle(sg, L[i]))) {
          // own dot: only the first point touches it, so a hit means the path doubles back through it
          if (i !== j || S[j].slice(1).some((sg) => hitsCircle(sg, L[i]))) ok = false;
        }
        if (ok && i > j) S[j].forEach((sg) => S[i].forEach((tg) => {
          if (!cross(sg, tg)) return;
          const hs = sg[0][1] === sg[1][1], ht = tg[0][1] === tg[1][1];
          if (hs === ht) { ok = false; return; } // parallel overlap: never allowed
          nCross += 1; over[hs ? i : j] += 1;
        }));
      }
      if (!ok) continue;
      const len = S.flat().reduce((t, [p, q]) => t + Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]), 0)
        + exit.reduce((t, e) => t + [0, 40, 40][e], 0) + nCross * 400;
      if (!best || len < best.len) best = { len, paths, over };
      }
    }
    return best ? best : { over: arrows.map(() => 0), paths: arrows.map(({ a: [lx, ly], b: [, ey] }, j) => [[lx + R, ly], [chan(j), ly], [chan(j), ey], [x2, ey]]) };
  })();
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 0 }} aria-hidden="true">
      <defs>
        {arrows.map(({ k, ink }, j) => (
          <marker key={k} id={`kp-arrow-${uid}-${j}`} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0.5 L8,4 L0,7.5 Z" fill={ink} />
          </marker>
        ))}
      </defs>
      {arrows.map((_, j) => j).sort((i, j) => routes.over[i] - routes.over[j]).map((j) => {
        const { k, ink } = arrows[j];
        const d = 'M' + routes.paths[j].map((q) => q.join(',')).join(' L');
        return (
          <g key={k}>
            {routes.over[j] > 0 && <path d={d} fill="none" stroke="#FCFCFB" strokeWidth={6} strokeLinejoin="round" />}{/* bridge gap */}
            <path d={d} fill="none" stroke={ink} strokeWidth={1.4} strokeLinejoin="round" markerEnd={`url(#kp-arrow-${uid}-${j})`} />
          </g>
        );
      })}
    </svg>
  );
}
// 5:4 cards (wideLeft) explain themselves (user 2026-11-09): task subtitle + self-describing axis titles.
const KW_SUB = [ // [task, worked example]; examples are item 0 of Aiden's Panda set (fk/fk_mc/ik/twisted :panda:spec:000)
  ["Task: given the Franka's 7 joint angles, output its end-effector position.",
    'Example: given [0.18, 0.03, 0.14, −2.13, −0.16, 1.97, 0.45] rad, return [0.50, 0.15, 0.38] m.'],
  ['Task: given joint angles, pick the end-effector position out of four options.',
    'Example: given [0.18, …, 0.45] rad, the answer is A [0.50, 0.15, 0.38] m out of options A–D.'],
  ['Task: given a target end-effector position, output joint angles that reach it.',
    'Example: given [0.50, 0.15, 0.38] m, return e.g. [0.18, 0.03, 0.14, −2.13, −0.16, 1.97, 0.45] rad.'],
  ["Task: given joint angles and an edited Franka geometry, output the end-effector position.",
    "Example: correct answer [−0.13, −0.07, 1.06] m; the real Franka's is [0.50, 0.15, 0.38] m."],
];
const KW_Y = ['Hand-position error (cm)', 'Correct answers (%)', 'Hand-position IK error (cm)', 'Distance from real Franka (cm)'];
const KW_X = ['Beats the curve by (cm)', 'Beats the curve by (points)', 'Beats the curve by (cm)', 'Beyond the curve (cm)'];
const MOBILE_Y = ['Hand-position error (cm)', 'MCQs answered correctly (%)', 'IK error (cm)', 'Distance from real Panda (cm)'];
function PairChart({ i, metric, topN = 0, mobile = false, wideLeft = false }) {
  const boxRef = useRef(null);
  const cap = mobile ? <>44 LLMs. {['FK error', 'MCQ', 'IK error', 'Edited-arm'][i]} data from Aiden Swann (2026).{wideLeft ? <> Curve and 95% band fitted without<br />Gemini 4 Argon, GPT-6 Astra, and GPT-6.1 Sol.</> : <><br />Curve and 95% band exclude Argon, Astra, and <span style={{ whiteSpace: 'nowrap' }}>GPT-6.1 Sol</span>.</>}</> : PAIR_CAP(metric, topN, i === 1 ? 'points' : 'cm');
  // wideLeft (5:4): caption sits under the scatter so the ranking runs down to the footer (user 2026-11-09).
  return (
    <figure className="rc-chart" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {wideLeft && <p style={{ margin: '-4px 0 6px', fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: 1.3, color: 'rgba(27,21,15,0.75)' }}>{KW_SUB[i][0]}<br />{KW_SUB[i][1]}</p>}
      <div ref={boxRef} style={{ flex: 1, minHeight: 0, display: 'flex', gap: wideLeft ? 10 : mobile ? 16 : 28, position: 'relative' }}>
        <PairArrows boxRef={boxRef} />
        <div style={{ flex: wideLeft ? 1.45 : mobile ? 1.15 : 1.5, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{cloneElement(KINEMATICS_PANELS[i].chart(), { noCaption: true, topTitle: true, showRank: false, plainDots: true, ...(mobile ? { noLabels: true, yTitle: wideLeft ? KW_Y[i] : MOBILE_Y[i] } : {}), ...(wideLeft ? { hint: ['↓ better', '↑ better', '↓ better', '↓ more overfit'][i] } : {}) })}</div>
        </div>
        <div style={{ flex: mobile ? 1.2 : 1, minWidth: 0, display: 'flex', position: 'relative', zIndex: 1 }}>{cloneElement(KIN_RANK_PANELS[i].chart(), { noCaption: true, rankOnly: true, topN, compact: mobile || topN > 0, ...(i === 3 ? { xTitle: 'Distance below predicted (cm)' } : {}), ...(mobile && i === 0 ? { xTitle: 'Error below predicted (cm)' } : {}), ...(wideLeft ? { xTitle: KW_X[i], hint: i < 3 ? '↑ better' : '↑ more overfit' } : {}) })}</div>
      </div>
      {wideLeft ? ( /* 5:4: caption left, attribution right on one row (user 2026-11-09) */
        <div style={{ position: 'relative', marginTop: 4 }}>{/* caption line 1 runs full width; line 2 is short and the attribution sits beside it */}
          <figcaption className="rc-chart-cap" style={{ margin: 0, whiteSpace: 'nowrap' }}>{cap}</figcaption>
          <div style={{ position: 'absolute', right: 0, bottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wordmark size={13} aria-label="Robocurve" style={{ opacity: 0.4, filter: 'grayscale(1)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(27,21,15,0.6)' }}>
              CC BY 4.0<span aria-hidden="true" style={{ width: 1, height: 12, background: 'rgba(27,21,15,0.3)' }} />robocurve.org
            </span>
          </div>
        </div>
      ) : <figcaption className="rc-chart-cap">{cap}</figcaption>}
    </figure>
  );
}
const pair = (i, metric, topN = 0, mobile = false, wideLeft = false) => () => <PairChart i={i} metric={metric} topN={topN} mobile={mobile} wideLeft={wideLeft} />;
export const KIN_PAIR_PANELS = [
  { id: 'kp-fk', title: KINEMATICS_PANELS[0].title, chart: pair(0, 'FK error') },
  { id: 'kp-mc', title: KINEMATICS_PANELS[1].title, chart: pair(1, 'multiple-choice') },
  { id: 'kp-ik', title: KINEMATICS_PANELS[2].title, chart: pair(2, 'IK error') },
  { id: 'kp-twist', title: KINEMATICS_PANELS[3].title, chart: pair(3, 'changed-table') },
];
export const KIN_PAIR_TOP_PANELS = KIN_PAIR_PANELS.map((p, i) => ({
  ...p, id: p.id.replace('kp-', 'kq-'), chart: pair(i, ['FK error', 'multiple-choice', 'IK error', 'changed-table'][i], 10),
}));
// Mobile 16:9 (user 2026-11-09): 520x292 CSS shot at 1920x1080, so text is ~1.6x the 840-wide cards; top 5 + leaders.
const MOBILE_TITLES = [ // one line at 520px (user 2026-11-09)
  'Panda FK: the top three sit at the edge of the trend',
  "Panda multiple choice: top three at the trend's edge",
  'General AI capability largely predicts robotics skill on Franka',
  'Changed Panda table: copying grows with capability',
];
export const KIN_PAIR_MOBILE_PANELS = KIN_PAIR_PANELS.map((p, i) => ({
  ...p, title: MOBILE_TITLES[i], id: p.id.replace('kp-', 'km-'), chart: pair(i, ['FK error', 'multiple-choice', 'IK error', 'changed-table'][i], 5, true),
}));
// 1:1 mobile (user 2026-11-09): same 520px width as km-*, 520px tall; top 10 (kt-*). Top-5 square dropped.
export const KIN_SQUARE_PANELS = [10].flatMap((n) => KIN_PAIR_MOBILE_PANELS.map((p, i) => ({
  ...p, id: p.id.replace('km-', 'kt-'), chart: pair(i, ['FK error', 'multiple-choice', 'IK error', 'changed-table'][i], n, true),
})));
// 1:1 top 10 with a wider scatter (user 2026-11-09): ku-*.
export const KIN_SQUARE_WIDE_PANELS = KIN_PAIR_MOBILE_PANELS.map((p, i) => ({
  ...p, id: p.id.replace('km-', 'ku-'), chart: pair(i, ['FK error', 'multiple-choice', 'IK error', 'changed-table'][i], 10, true, true),
}));
// 5:4 top 10, wider scatter (user 2026-11-09): kw-*, 580x464 CSS.
export const KIN_WIDE54_PANELS = KIN_PAIR_MOBILE_PANELS.map((p, i) => ({
  ...p, title: i < 3 ? `General AI capability largely predicts robotics skill on the Franka${[' (FK)', ' (MCQ)', ''][i]}`
    : 'General AI capability largely predicts overfitting to a Franka', id: p.id.replace('km-', 'kw-'), chart: pair(i, ['FK error', 'multiple-choice', 'IK error', 'changed-table'][i], -15, true, true),
}));
