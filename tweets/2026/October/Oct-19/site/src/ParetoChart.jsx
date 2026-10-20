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
import { LAB, VLA_LAB, MODELS as ALL_MODELS, LogoMarker, LegendGlyph, withMode, LABEL_INK } from './robodojoModels.jsx';
import { useChartSize } from './useChartSize.js';
import { placeLabels } from './placeLabels.js';

const METRICS = {
  cost: {
    get: (m) => m.cost, max: 4, ticks: [0, 1, 2, 3, 4], tick: (v) => `$${v}`, fmt: (v) => `$${v.toFixed(2)} per attempt`, short: (v) => `$${v.toFixed(2)}`,
    fromOrigin: true,
    // label placement per config: [dx, dy, anchor]
    place: {
      'GPT-6 Astra (high)': [0, -14, 'middle'], 'Opus 5.5 (high)': [12, 12, 'start'],
      'GPT-6 Astra (medium)': [10, 18, 'start'], 'Opus 5.5 (medium)': [-10, -12, 'end'],
      'GPT-6 Sol (high)': [0, 20, 'middle'], 'GPT-5.6 Sol (high)': [12, 4, 'start'],
      'GPT-6.1 Sol (high)': [-12, -24, 'end'],
      'Gemini 3.8 Flash (high)': [12, 32, 'start'],
      'Gemini 4 Argon (high)': [-12, -14, 'end'],
    },
  },
  time: {
    get: (m) => m.mins, max: 24, ticks: [0, 6, 12, 18, 24], tick: (v) => `${v} min`, fmt: (v) => `${v.toFixed(1)} min per attempt`, short: (v) => `${v.toFixed(1)} min`,
    fromOrigin: true,
    place: {
      'GPT-6 Astra (high)': [-12, -16, 'end'], 'Opus 5.5 (high)': [-12, 4, 'end'],
      'GPT-6 Astra (medium)': [4, 26, 'start'], 'Opus 5.5 (medium)': [12, 4, 'start'],
      'GPT-6 Sol (high)': [12, 4, 'start'], 'GPT-5.6 Sol (high)': [-12, 4, 'end'],
      'GPT-6.1 Sol (high)': [65, -38, 'start'],
      'Gemini 3.8 Flash (high)': [0, 30, 'middle'], // below: the frontier's flat tail runs above it
      'Gemini 4 Argon (high)': [-12, -14, 'end'],
    },
  },
};

// Container px below which the hand-placed labels would collide at 12px:
// only frontier models get (auto-placed) labels. Must match the `@container rc-chart (max-width: 599px)`
// rule in tokens/base.css (test/screen-constants.test.mjs checks).
export const NARROW = 600;
// Page-coloured outline so labelAll labels stay legible over the frontier line.
const HALO = { paintOrder: 'stroke', stroke: 'var(--surface-page, #FBFAF6)', strokeWidth: 4, strokeLinejoin: 'round' };
// Label leader lines: thin neutral grey, never the series colour (user 2026-10-18).
const LEADER = 'rgba(27,21,15,0.35)';
const AI2_PINK = '#F45096'; // Ai2 (MolmoAct2) is not in LAB: the release chart builds a frontier per LAB entry
const M = { top: 14, right: 24, bottom: 32, left: 44 };
const YMAX = 1; // full 0–100% scale (user 2026-09-30)
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const pct = (s) => `${(s * 100).toFixed(1)}%`;

// `caption` replaces the default figcaption (the /draft/ Gemini 4 cards, user 2026-10-14).
// `models` overrides the shared list; `labelAll` labels every model at narrow widths, not just the frontier
// (both for the /draft/ Gemini 4 time card, user 2026-10-14).
export function ParetoChart({ metric = 'cost', width = 720, height = 350, caption = null, models: MODELS = ALL_MODELS, labelAll = false, label = withMode, labelOnly = null,
  // /draft/ X-card trims (user 2026-10-14): y range, no legend, no frontier line, label colour overrides.
  yMax: YMAX_ = YMAX, yTicks = Y_TICKS, legend = true, frontierLine = true, labelInk = {}, colBelow = null, frontierLabelAt = null, xMax = null, xTicks = null, inlinePlace = {}, colAt = null, colGap = 15,
  // Previous frontier (/draft/ Dream-1 cards, user 2026-10-18): `oldExclude` names the new
  // configs; the frontier without them is drawn faint, with an arrow at x = `arrowAt` up to the new one.
  oldExclude = null, arrowAt = null, arrowTo = null, arrowLabel = null, arrowLabelPos = null, arrowFrom = null, oldLabelAt = null,
  // logX ([min, max], /draft/ Dream-1 log variants, user 2026-10-18): log-scale x axis.
  logX = null, tickFmt = null }) {
  const X = { ...METRICS[metric], ...(xMax ? { max: xMax } : {}), ...(xTicks ? { ticks: xTicks } : {}) };
  const [plotRef, W, H] = useChartSize(width, height);
  const narrow = W < NARROW;
  // On a log axis the frontier's origin point clamps to the axis corner (x(0) = left edge), user 2026-10-18.
  if (logX) { X.max = logX[1]; }
  if (tickFmt) X.tick = tickFmt;
  const x = logX
    ? (v) => M.left + ((Math.log(Math.max(v, logX[0])) - Math.log(logX[0])) / (Math.log(logX[1]) - Math.log(logX[0]))) * (W - M.left - M.right)
    : (v) => M.left + (v / X.max) * (W - M.left - M.right);
  const y = (s) => M.top + (1 - s / YMAX_) * (H - M.top - M.bottom);
  let best = -1;
  const order = [...MODELS].sort((a, b) => X.get(a) - X.get(b));
  const frontierList = order.filter((m) => (m.score > best ? ((best = m.score), true) : false));
  const frontier = new Set(frontierList.map((m) => m.name));
  const pts = frontierList.map((m) => `${x(X.get(m))},${y(m.score)}`);
  // The last frontier point holds flat to the plot's right edge: nothing
  // costlier (or slower) does better (user 2026-10-07).
  const path = `M${X.fromOrigin ? `${x(0)},${y(0)}L` : ''}${pts.join('L')}H${W - M.right}`;
  const frontierOf = (ms) => { let b = -1; return [...ms].sort((a, c) => X.get(a) - X.get(c)).filter((m) => (m.score > b ? ((b = m.score), true) : false)); };
  const oldList = oldExclude ? frontierOf(MODELS.filter((m) => !oldExclude.has(m.name))) : null;
  const oldPath = oldList && `M${X.fromOrigin ? `${x(0)},${y(0)}L` : ''}${oldList.map((m) => `${x(X.get(m))},${y(m.score)}`).join('L')}H${W - M.right}`;
  // Score on a frontier polyline at x value v (linear between points, flat after the last).
  const scoreAt = (list, v) => {
    const P = [...(X.fromOrigin ? [[0, 0]] : []), ...list.map((m) => [X.get(m), m.score])];
    for (let i = 1; i < P.length; i++) if (v <= P[i][0]) return P[i - 1][1] + ((v - P[i - 1][0]) / (P[i][0] - P[i - 1][0])) * (P[i][1] - P[i - 1][1]);
    return P[P.length - 1][1];
  };
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const pick = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H;
    let hit = null, bd = 22 * 22;
    for (const m of MODELS) {
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
  // labelAll: models left of the label column get de-overlapped labels in a
  // column at COL_AT on the x axis, with leader lines; the rest label inline.
  const COL_AT = colAt ?? X.max * 0.42; // right of every clustered point (Gemini 3.8 Flash at 7.2 min doubled its leader back at 0.34)
  const colX = x(COL_AT);
  const colLabels = labelAll ? (() => {
    const pts = MODELS.filter((m) => (colAt != null || X.get(m) < COL_AT) && !inlinePlace[m.name] && (!labelOnly || labelOnly.has(m.name))).map((m) => ({ m, px: x(X.get(m)), py: y(m.score) }))
      .sort((a, b) => a.py - b.py);
    let prev = -Infinity;
    // colBelow (a score): start the column below that level, clear of points further right.
    const floor = colBelow == null ? -Infinity : y(colBelow);
    pts.forEach((p) => { p.ly = Math.max(p.py + 4, prev + colGap, floor); prev = p.ly; });
    const over = prev - (H - M.bottom - 4);
    if (over > 0) pts.forEach((p) => { p.ly -= over; });
    return pts;
  })() : [];
  const inlineAll = labelAll ? MODELS.filter((m) => ((colAt == null && X.get(m) >= COL_AT) || inlinePlace[m.name]) && (!labelOnly || labelOnly.has(m.name))) : [];
  const narrowLabels = narrow && !labelAll ? placeLabels(
    (labelAll ? order : frontierList).map((m) => ({ key: m.name, x: x(X.get(m)), y: y(m.score), text: label(m) })).reverse(),
    { x0: M.left + 2, y0: 2, x1: W - 2, y1: H - M.bottom - 4 },
  ) : [];
  const summary = order.map((m) => `${withMode(m)} ${pct(m.score)} at ${X.fmt(X.get(m))}${frontier.has(m.name) ? ' (frontier)' : ''}`).join('; ');
  return (
    <figure className="rc-chart">
      {legend && (
      <ul className="rc-chart-legend" aria-label="Lab">
        <li style={{ color: LABEL_INK.anthropic }}><LegendGlyph kind="dot" color={LAB.anthropic} lab="anthropic" ring={LABEL_INK.anthropic} />Anthropic</li>
        <li style={{ color: LABEL_INK.openai }}><LegendGlyph kind="dot" color={LAB.openai} lab="openai" ring={LABEL_INK.openai} />OpenAI</li>
        <li style={{ color: LABEL_INK.google }}><LegendGlyph kind="dot" color={LAB.google} lab="google" ring={LABEL_INK.google} />Google</li>
        {MODELS.some((m) => m.lab === 'ai2') && <li style={{ color: LABEL_INK.ai2 }}><LegendGlyph kind="dot" color={AI2_PINK} lab="ai2" ring={LABEL_INK.ai2} />Ai2</li>}
        <li><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" className="rc-chart-frontier" /></svg>Pareto frontier</li>
      </ul>
      )}
      <div className="rc-chart-plot" ref={plotRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0}
          aria-label={`Scatter of RoboDojo-RC Tier 1 mean score against ${metric === 'cost' ? 'estimated cost' : 'wall-clock time'} per task attempt. ${summary}. Use arrow keys to step through models.`}
          onPointerMove={pick} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="rc-chart-grid" />
              <text x={M.left - 8} y={y(v)} className="rc-chart-tick" textAnchor="end" dominantBaseline="middle">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {X.ticks.map((c) => (
            <text key={c} x={x(c)} y={H - M.bottom + 18} className="rc-chart-tick" textAnchor="middle">{X.tick(c)}</text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="rc-chart-axis" />

          {oldPath && <path d={oldPath} fill="none" className="rc-chart-frontier" style={{ opacity: 0.4 }} />}
          {oldPath && oldLabelAt != null && (
            <text x={x(oldLabelAt.x ?? oldLabelAt)} y={y(scoreAt(oldList, oldLabelAt.x ?? oldLabelAt)) + (oldLabelAt.dy ?? 16)} textAnchor={oldLabelAt.anchor ?? 'middle'} className="rc-chart-label" style={{ ...HALO, fill: 'rgba(27,21,15,0.4)' }}>Previous frontier</text>
          )}
          {frontierLine && <path d={path} fill="none" className="rc-chart-frontier" />}
          {/* Drawn after the frontier so the arrow label's halo masks the line. */}
          {/* Arrow from the previous frontier at x = arrowAt, straight to the new model (`arrowTo`), user 2026-10-18. */}
          {oldPath && arrowAt != null && (() => {
            const tgt = MODELS.find((m) => m.name === arrowTo);
            const tx0 = tgt ? x(X.get(tgt)) : x(arrowAt), ty0 = tgt ? y(tgt.score) : y(scoreAt(frontierList, arrowAt));
            // arrowAt === 'nearest' | 'diag45' (user 2026-10-18): start at the point on the previous frontier
            // closest (in px) to the target, so the arrow is as short as possible.
            let sx, sy;
            // arrowFrom (user 2026-10-18): start at a named model's badge edge instead of the frontier.
            const src = arrowFrom && MODELS.find((m) => m.name === arrowFrom);
            if (src && tgt) {
              const px = x(X.get(src)), py = y(src.score), d0 = Math.hypot(tx0 - px, ty0 - py) || 1;
              sx = px + ((tx0 - px) / d0) * 18; sy = py + ((ty0 - py) / d0) * 18;
            } else
            if ((arrowAt === 'nearest' || arrowAt === 'diag45') && tgt) {
              const P = [...(X.fromOrigin ? [[x(0), y(0)]] : []), ...oldList.map((m) => [x(X.get(m)), y(m.score)])];
              P.push([W - M.right, P[P.length - 1][1]]);
              let best = Infinity;
              for (let i = 1; i < P.length; i++) {
                const [ax, ay] = P[i - 1], [bx, by] = P[i], vx = bx - ax, vy = by - ay;
                let t;
                if (arrowAt === 'diag45') {
                  // Point where the arrow runs at 45° up-left: (px - tx) = (py - ty).
                  const den = vx - vy; if (Math.abs(den) < 1e-9) continue;
                  t = ((tx0 - ty0) - (ax - ay)) / den; if (t < 0 || t > 1) continue;
                } else t = Math.max(0, Math.min(1, ((tx0 - ax) * vx + (ty0 - ay) * vy) / (vx * vx + vy * vy || 1)));
                const px = ax + t * vx, py = ay + t * vy, dd = Math.hypot(tx0 - px, ty0 - py);
                if (px > tx0 && dd < best) { best = dd; sx = px; sy = py; }
              }
              if (!Number.isFinite(best)) { // no 45° point: fall back to the nearest point
                for (let i = 1; i < P.length; i++) {
                  const [ax, ay] = P[i - 1], [bx, by] = P[i], vx = bx - ax, vy = by - ay;
                  const t = Math.max(0, Math.min(1, ((tx0 - ax) * vx + (ty0 - ay) * vy) / (vx * vx + vy * vy || 1)));
                  const px = ax + t * vx, py = ay + t * vy, dd = Math.hypot(tx0 - px, ty0 - py);
                  if (dd < best) { best = dd; sx = px; sy = py; }
                }
              }
              // Step the start off any nearby badge (badges ~13 px radius).
              const ux = (tx0 - sx) / best, uy = (ty0 - sy) / best;
              for (let k = 0; k < 60 && MODELS.some((m) => m !== tgt && Math.hypot(x(X.get(m)) - sx, y(m.score) - sy) < 21); k++) { sx += ux; sy += uy; }
              sx += ux * 3; sy += uy * 3; // clear of badges (~13 px) by ~8 px (user 2026-10-18)
            } else { sx = x(arrowAt); sy = y(scoreAt(oldList, arrowAt)) - 6; }
            const d = Math.hypot(tx0 - sx, ty0 - sy) || 1, gap = tgt ? 19 : 6;
            const tx = tx0 + ((sx - tx0) / d) * gap, ty = ty0 + ((sy - ty0) / d) * gap;
            const a = Math.atan2(ty - sy, tx - sx), h = 7;
            const head = `M${tx - h * Math.cos(a - 0.5)},${ty - h * Math.sin(a - 0.5)}L${tx},${ty}L${tx - h * Math.cos(a + 0.5)},${ty - h * Math.sin(a + 0.5)}`;
            // Label along the arrow, on its upper side (user 2026-10-18: "better & cheaper").
            let rot = (a * 180) / Math.PI; if (rot > 90) rot -= 180; if (rot < -90) rot += 180;
            const mx = (sx + tx) / 2, my = (sy + ty) / 2, r = (rot * Math.PI) / 180;
            const lx = mx + 9 * Math.sin(r), ly = my - 9 * Math.cos(r);
            return (
              <g>
                <g stroke="rgba(27,21,15,0.75)" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d={`M${sx},${sy}L${tx},${ty}`} />
                  <path d={head} />
                </g>
                {arrowLabel && arrowLabelPos && <text x={mx + arrowLabelPos[0]} y={my + arrowLabelPos[1]} textAnchor={arrowLabelPos[2] || 'start'} dominantBaseline="middle"
                  className="rc-chart-label rc-chart-label-strong" style={{ ...HALO, fill: 'rgba(27,21,15,0.8)' }}>{arrowLabel}</text>}
                {arrowLabel && !arrowLabelPos && <text x={lx} y={ly} textAnchor="middle" transform={`rotate(${rot.toFixed(1)} ${lx} ${ly})`} className="rc-chart-label rc-chart-label-strong" style={{ ...HALO, fill: 'rgba(27,21,15,0.8)' }}>{arrowLabel}</text>}
              </g>
            );
          })()}
          {/* Direct label on the frontier's flat tail when the legend is off: frontierLabelAt = x value. */}
          {frontierLine && frontierLabelAt != null && (
            <text x={x(typeof frontierLabelAt === 'number' ? frontierLabelAt : frontierLabelAt.x)}
              y={typeof frontierLabelAt === 'number' ? y(frontierList[frontierList.length - 1].score) - 8 : y(frontierLabelAt.s)}
              textAnchor={typeof frontierLabelAt === 'number' ? 'middle' : 'start'} className="rc-chart-label" style={{ ...HALO, fill: 'rgba(27,21,15,0.55)' }}>Pareto frontier</text>
          )}

          {/* Frontier names take their lab's colour (OpenAI stays ink), as on
             the release-date chart (user 2026-10-07). */}
          {/* Frontier models drawn last so their badges sit on top of any
             overlapping off-frontier ones (user 2026-10-07). */}
          {/* Label leaders under the points (user 2026-10-18). */}
          {colLabels.map(({ m, px, py, ly }) => (
            <polyline key={`${m.name}-col`} points={px + 24 > colX ? `${px + 10},${py} ${colX - 4},${ly - 4}` : `${px + 10},${py} ${colX - 14},${ly - 4} ${colX - 4},${ly - 4}`} fill="none" stroke={LEADER} strokeWidth={0.8} />
          ))}
          {inlineAll.filter((m) => inlinePlace[m.name]?.[3]).map((m) => {
            const [dx, dy, anchor] = inlinePlace[m.name], px = x(X.get(m)), py = y(m.score);
            const ex = px + dx + (anchor === 'start' ? -3 : anchor === 'end' ? 3 : 0), ey = py + dy + (dy > 0 ? -15 : 5);
            const d = Math.hypot(ex - px, ey - py) || 1;
            // inlinePlace[4] === 'curve' (user 2026-10-18): a smooth leader that leaves the point vertically
            // (down or up, toward the label), then sweeps across to it (quadratic).
            if (inlinePlace[m.name][4] === 'curve') {
              const ex2 = anchor === 'start' ? px + dx - 4 : anchor === 'end' ? px + dx + 4 : px + dx, ey2 = py + dy - 5;
              return <path key={`${m.name}-lead`} d={`M${px},${py + (dy > 0 ? 15 : -15)}Q${px},${ey2} ${ex2},${ey2}`} fill="none" stroke={LEADER} strokeWidth={0.8} />;
            }
            return <line key={`${m.name}-lead`} x1={px + ((ex - px) / d) * 15} y1={py + ((ey - py) / d) * 15} x2={ex} y2={ey} stroke={LEADER} strokeWidth={0.8} />;
          })}
          {[...MODELS].sort((a, b) => frontier.has(a.name) - frontier.has(b.name)).map((m) => {
            const [dx, dy, anchor] = X.place[m.name] || [12, 4, 'start'];
            const front = frontier.has(m.name);
            const cx = x(X.get(m)), cy = y(m.score);
            return (
              <g key={m.name}>
                {/* Stop above labels below the point, and below labels above it. */}
                {!narrow && (m.name === 'GPT-6.1 Sol (high)' || m.lab === 'google') && <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy + (dy > 0 ? -16 : 4)} stroke={LAB[m.lab] || VLA_LAB[m.lab] || AI2_PINK} strokeWidth={0.8} opacity={0.6} />}
                {/* Lab logo badges, as on the release-date chart (user 2026-10-07). */}
                <LogoMarker lab={m.lab} cx={cx} cy={cy} big={front || !!labelInk[m.name]} ring={LABEL_INK[m.lab]} />
                {!narrow && <text x={cx + dx} y={cy + dy} textAnchor={anchor} className={front ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'}
                  style={front && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>{withMode(m)}</text>}
              </g>
            );
          })}

          {colLabels.map(({ m, px, py, ly }) => {
            const front = frontier.has(m.name);
            return (
              <g key={m.name}>
                <text x={colX} y={ly} className={front ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'} style={{ ...HALO, ...(front && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : {}), ...(labelInk[m.name] ? { fill: labelInk[m.name], fontWeight: 700 } : {}) }}>{label(m)}</text>
              </g>
            );
          })}
          {/* inlinePlace [dx, dy, anchor, leader]: leader draws a short line from the point up to a raised label. */}
          {inlineAll.map((m) => (
            <text key={m.name} x={x(X.get(m)) + (inlinePlace[m.name]?.[0] ?? 0)} y={y(m.score) + (inlinePlace[m.name]?.[1] ?? -16)} textAnchor={inlinePlace[m.name]?.[2] ?? 'middle'} className={frontier.has(m.name) ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'}
              style={{ ...HALO, ...(frontier.has(m.name) && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : {}), ...(labelInk[m.name] ? { fill: labelInk[m.name], fontWeight: 700 } : {}) }}>{label(m)}</text>
          ))}
          {narrowLabels.map((l) => {
            const m = MODELS.find((mm) => mm.name === l.key);
            return (
              <g key={l.key}>
                <line {...l.leader} stroke={LAB[m.lab] || VLA_LAB[m.lab] || AI2_PINK} strokeWidth={1.25} opacity={0.85} />
                <text x={l.x} y={l.y} textAnchor={l.anchor} className={frontier.has(m.name) ? 'rc-chart-label rc-chart-label-strong' : 'rc-chart-label'} style={frontier.has(m.name) && m.lab !== 'openai' ? { fill: LABEL_INK[m.lab] } : undefined}>
                  {l.lines.map((t, i) => <tspan key={i} x={l.x} dy={i ? 14 : 0}>{t}</tspan>)}
                </text>
              </g>
            );
          })}

          {hover && <circle cx={hx} cy={hy} r={14} fill="none" stroke={LAB[hover.lab] || AI2_PINK} strokeWidth={1.5} pointerEvents="none" />}
        </svg>
        {hover && (
          <div className="rc-chart-tip" role="status" style={{
            left: `${(hx / W) * 100}%`, top: `${(hy / H) * 100}%`,
            transform: `translate(${hx > W * 0.6 ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
          }}>
            <strong>{withMode(hover)}</strong>
            <span>{pct(hover.score)} score · {X.fmt(X.get(hover))}</span>
            <span>{frontier.has(hover.name) ? 'On the Pareto frontier' : 'Below the frontier'} · {hover.n} attempts</span>
          </div>
        )}
      </div>
      <figcaption className="rc-chart-cap">
        {caption || <>Mean score vs. {metric === 'cost' ? 'estimated API cost' : 'wall-clock time'} per task attempt, 120 attempts per configuration. Source: <a href={PARETO_RUNS}>All runs</a>.</>}
      </figcaption>
      <div className="rc-sr-only"><table>
        <caption>Score and {metric} per model config, RoboDojo-RC Tier 1</caption>
        <thead><tr><th scope="col">Model</th><th scope="col">Mean score</th><th scope="col">{metric === 'cost' ? 'Cost per attempt' : 'Minutes per attempt'}</th><th scope="col">Pareto frontier</th></tr></thead>
        <tbody>
          {order.map((m) => <tr key={m.name}><td>{withMode(m)}</td><td>{pct(m.score)}</td><td>{X.fmt(X.get(m))}</td><td>{frontier.has(m.name) ? 'Yes' : 'No'}</td></tr>)}
        </tbody>
      </table></div>
    </figure>
  );
}
