/* Callout labels for narrow charts (< NARROW px), where the desktop's
   hand-placed offsets collide at 12px. Every label sits ABOVE its own point
   on a vertical leader line, its text starting at the leader (or ending at
   it, when it would run off the right edge), so each name is visibly tied to
   its dot (user 2026-10-02: no detached legends). Labels stack upward into
   the plot's empty top half: a label whose text spans another point's
   leader is lifted above that point's label, so leaders never cross text.
   Deterministic, no search — the same data always lays out the same way.

   items:   [{ key, x, y, text }]
   bounds:  { x0, y0, x1, y1 } where label boxes may go
   returns: [{ key, anchor, x, y, lines, leader }] — `x`/`y` are the text
            anchor and first baseline; `leader` is { x1, y1, x2, y2 }. */

const CHAR_W = 6.9;   // ~12px sans, semibold-safe — fallback estimate
const LINE_H = 14;
const ASCENT = 10;
const GAP = 4;        // between stacked labels
const LIFT = 14;      // a label's bottom sits at least this far above its point

// Real text width: the labels only render after hydration (narrow mode needs
// a measured width), so a canvas can measure them in the label font.
let ctx;
function textWidth(t) {
  if (typeof document === 'undefined') return t.length * CHAR_W;
  if (!ctx) {
    ctx = document.createElement('canvas').getContext('2d');
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
    if (ctx) ctx.font = `600 12px ${family}`;
  }
  return ctx ? ctx.measureText(t).width + 1 : t.length * CHAR_W;
}

// "GPT-6 Astra (high) (fast)" → one line, or name / "(high) (fast)".
const split = (text) => {
  const i = text.indexOf(' (');
  return i > 0 ? [text.slice(0, i), text.slice(i + 1)] : [text];
};

function layout(items, bounds, twoLine, ends) {
  const L = items.map((it, i) => {
    const lines = twoLine ? split(it.text) : [it.text];
    const w = Math.max(...lines.map(textWidth)), h = lines.length * LINE_H;
    const anchor = ends[i] ? 'end' : 'start';
    const left = anchor === 'start' ? it.x : it.x - w;
    return { it, lines, w, h, anchor, left, right: left + w };
  });
  if (L.some((a) => a.left < bounds.x0 - 0.5 || a.right > bounds.x1 + 0.5)) return null;
  // a covers b when a's text spans b's leader: a must then sit above b.
  const covers = (a, b) => a !== b && b.it.x > a.left - 2 && b.it.x < a.right + 2;
  const placed = [];
  const remaining = [...L];
  while (remaining.length) {
    // Next (bottom-up): the label covering the fewest unplaced leaders
    // (ideally none); ties go to the lowest point.
    const n = (a) => remaining.filter((b) => covers(a, b)).length;
    const a = remaining.reduce((p, q) => (n(q) < n(p) || (n(q) === n(p) && q.it.y > p.it.y) ? q : p));
    remaining.splice(remaining.indexOf(a), 1);
    let bottom = a.it.y - LIFT;
    for (const p of placed) {
      const overlapsX = p.left < a.right + GAP && a.left < p.right + GAP;
      if (overlapsX || covers(a, p)) bottom = Math.min(bottom, p.top - GAP);
    }
    a.top = bottom - a.h;
    placed.push(a);
  }
  // Clashes: a leader running up through a label (from a covering cycle),
  // or a label pushed out of the plot. Zero means a clean layout.
  let clashes = placed.filter((a) => a.top < bounds.y0).length;
  for (const a of placed) for (const b of placed) if (covers(a, b) && a.top >= b.top) clashes++;
  return { placed, clashes, top: Math.min(...placed.map((a) => a.top)) };
}

export function placeLabels(items, bounds) {
  // Try every text direction (start/end at the leader) for one- then
  // two-line labels — at most 2 × 2^4 layouts for the charts' 2–4 labels —
  // and keep the one with fewest clashes, then one-line, then the shortest
  // stack.
  let run = null;
  for (const twoLine of [false, true]) {
    for (let mask = 0; mask < 1 << Math.min(items.length, 6); mask++) {
      const r = layout(items, bounds, twoLine, items.map((_, i) => (mask >> i) & 1));
      if (r && (!run || r.clashes < run.clashes || (r.clashes === run.clashes && !twoLine === !run.twoLine && r.top > run.top))) run = { ...r, twoLine };
    }
  }
  return items.map((it) => {
    const a = run.placed.find((p) => p.it === it);
    return {
      key: it.key,
      anchor: a.anchor,
      x: a.anchor === 'start' ? a.left : a.right,
      y: a.top + ASCENT,
      lines: a.lines,
      leader: { x1: it.x, y1: it.y - 9, x2: it.x, y2: a.top + a.h + 1 },
    };
  });
}
