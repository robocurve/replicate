/* Trends (was "Leaderboards") — the plot panels from the comp's "Scored by a robot"
   section (its heading block was cut, user 2026-09-29) (Figma
   5T8tWo1lYlYHPlOn97axTI, node 2365:12922; plans/0006). Copy and panels are
   the comp's placeholders until the user lists what carries over; three
   panels (user calls, 2026-09-29).

   Layout (base.css .rc-trends-*): a sticky list of panel titles on the left, the
   stacked panels joined by a hairline, and an empty right column that keeps
   them centred. The panel crossing the middle of
   the viewport is the active one — full strength and elevated; the rest sit
   at the comp's 40%. No view tabs: Ranking / vs Cost / over time become
   separate plots (user 2026-09-29). Below 1000px it is one
   column and the side list is hidden. */

import React from 'react';
import { SpeedChart } from './SpeedChart.jsx';
import { ParetoChart } from './ParetoChart.jsx';
import { ReleaseChart } from './ReleaseChart.jsx';

const TimeChart = () => <ParetoChart metric="time" />;
export const LogoReleaseChart = (props) => <ReleaseChart overall logos keepLabels={['Opus 5.5 (high)', 'GPT-6.1 Sol (high)', 'GPT-6 Sol (high)']} colorLabels {...props} />;


export const TREND_PANELS = [
  { id: 'lb-2', nav: 'Scores vs Cost', title: 'LLM Robotics Capabilities vs Cost', body: <>Mean score on <a href="/opus-5-5-robodojo-rc-tier-1/">RoboDojo-RC Tier 1</a> against the estimated cost of each task attempt.</>, chart: ParetoChart },
  { id: 'lb-4', nav: 'Scores vs Time', title: 'LLM Robotics Capabilities vs Time', body: <>Mean score on <a href="/opus-5-5-robodojo-rc-tier-1/">RoboDojo-RC Tier 1</a> against the wall-clock time of each task attempt.</>, chart: TimeChart },
  // Replaced the per-lab release-date chart (and an overall-frontier copy)
  // with the logo version that became the X card (user 2026-10-07); keeps
  // the old panel's id so shared #lb-3 links still land here.
  { id: 'lb-3', nav: 'Scores over Time', title: 'LLM Robotics Capabilities vs Release Date', body: <>Mean score on <a href="/opus-5-5-robodojo-rc-tier-1/">RoboDojo-RC Tier 1</a> against each model’s public release date; the line traces the best score released so far.</>, chart: LogoReleaseChart },
  { id: 'lb-1', nav: 'LLM Inference Speed', title: 'LLM inference is getting much faster over time', body: 'Models are grouped by their Artificial Analysis (AA) Intelligence Index score.', chart: SpeedChart },
];

export function Panel({ panel, index, active, footer = null }) {
  return (
    <article id={panel.id} data-trend-index={index} className={`rc-trends-panel${active ? ' rc-trends-active' : ''}`} aria-labelledby={`${panel.id}-title`}>
      <div className="rc-trends-copy">
        <h3 id={`${panel.id}-title`} className="rc-trends-title">{panel.title}</h3>
        {panel.body && <p className="rc-trends-body">{panel.body}</p>}
      </div>
      <hr className="rc-trends-rule" />
      {/* The comp's 656×458 plot slot ("image 174"): the panel's chart, or
         an empty placeholder until its plot lands. */}
      {panel.chart ? <panel.chart /> : <div className="rc-trends-slot" aria-hidden="true" />}
      {footer}
    </article>
  );
}

export function Trends() {
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef(null);
  React.useEffect(() => {
    const root = listRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    // A thin band across the middle of the viewport: whichever panel
    // crosses it is active.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.trendIndex)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    root.querySelectorAll('.rc-trends-panel').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const jump = (i) => {
    const el = document.getElementById(TREND_PANELS[i].id);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };
  return (
    <section id="trends" className="rc-sec rc-trends" aria-labelledby="trends-heading">
      {/* Old name: keeps shared /#leaderboards links landing here. */}
      <span id="leaderboards" aria-hidden="true" />
      <h2 id="trends-heading" className="rc-trends-h2">How Frontier Models Perform on Robots</h2>
      <div className="rc-trends-grid">
        <nav className="rc-trends-nav" aria-label="Trends">
          <ul>
            {TREND_PANELS.map((p, i) => (
              <li key={p.id}>
                <button type="button" className={`rc-trends-navitem${i === active ? ' rc-trends-navitem-on' : ''}`}
                  aria-current={i === active ? 'true' : undefined} onClick={() => jump(i)}>
                  <span className="rc-trends-dot" aria-hidden="true" />{p.nav}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rc-trends-panels" ref={listRef}>
          {TREND_PANELS.map((p, i) => <Panel key={p.id} panel={p} index={i} active={i === active} />)}
        </div>
        {/* Empty right column keeps the panels centred (user 2026-09-29). */}
        <div className="rc-trends-spacer" aria-hidden="true" />
      </div>
    </section>
  );
}
