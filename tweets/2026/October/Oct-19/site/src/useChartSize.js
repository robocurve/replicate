/* The rendered px size of a chart's plot box, so a chart can lay itself out
   at one SVG unit = one CSS pixel. A fixed viewBox scaled to fit shrank
   every label with the plot (4.5–5px type on phones); laying out at the real
   size keeps text at its set size on every screen.

   CSS owns the box (width from the layout, height from a container-query
   clamp in base.css), so it is the same size before and after hydration —
   only the drawing inside it changes, never the page layout. Returns
   [ref, width, height]; before mount (the prerender) and without
   ResizeObserver they are the fallbacks — the desktop layout. */

import React from 'react';

// useLayoutEffect warns under renderToString (the prerender); measure before
// paint in the browser so the fallback layout flashes as little as possible.
const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function useChartSize(fallbackW, fallbackH) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState([fallbackW, fallbackH]);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w > 0 && h > 0) setSize((s) => (s[0] === w && s[1] === h ? s : [w, h]));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size[0], size[1]];
}
