/* /draft/ — X-ready media: the "Frontier by Model" trend panel, alone on
   the page for screenshotting (user 2026-10-05). Same chart as the
   homepage panel, re-framed for X: a 420×525 CSS frame (4:5, X's tallest
   uncropped single image, as Epoch AI posts) shot at 1200/420× = 1200×1500, with a
   shorter title/subtitle and no card chrome (user 2026-10-07).
   Unlisted: noindex and out of the sitemap (build.mjs ROUTES). */

import { Panel, TREND_PANELS, LogoReleaseChart } from './Trends.jsx';
import { Wordmark } from './components/Wordmark.jsx';
import { G4_PANELS, G4_VIDEO_PANEL } from './Gemini4Cards.jsx';
import { RCI_PANELS } from './RciCards.jsx';
import { D1_PANELS, D1_WIDE_PANEL, D1_LOG_PANELS } from './Dream1Cards.jsx';

// X shrinks images to ~360px wide on phones, so the frame is laid out
// narrow (type stays the site's px sizes, so it reads ~1.6× larger relative
// to the image) and screenshotted at high DPR; the chart keeps its desktop
// labelling (user 2026-10-07). No source link: it can't be clicked in an image.
const DRAFT_W = 420, DRAFT_H = 525;
// Method line pre-empting the red-team questions (user 2026-10-07); facts
// from the published RoboDojo-RC Tier 1 reports' technical specifications.
const CAPTION = <>
  Models see 3 cameras and command the 6-DOF end-effector pose + gripper of
  two YAM arms via ≤40 tool calls per attempt. (high) = high reasoning effort.
  Score = mean task progress over 120 attempts (6 tasks). <span style={{ whiteSpace: 'nowrap' }}>Bold = new best.</span>
</>;
const panel = {
  ...TREND_PANELS.find((p) => p.id === 'lb-3'),
  title: 'The best LLM score on a real-robot benchmark rose from 15% to 43% in 2 months',
  body: 'RoboDojo-RC Tier 1, a real-world bimanual benchmark',
  chart: () => <LogoReleaseChart wide caption={CAPTION} axisTitles={{ x: 'Model release date', y: 'Mean task progress' }} />,
};
// Second card: the same chart on success rate (attempts graded fully
// complete) instead of mean task progress (user 2026-10-07). On this metric
// Gemini 3.8 Flash, not GPT-6 Astra, holds the best score, so Astra is
// labelled as an off-frontier model; the y-axis tops out at 20% so the
// 1–13% points stay legible.
const SUCCESS_CAPTION = <>
  Models see 3 cameras and command the 6-DOF end-effector pose + gripper of
  two YAM arms via ≤40 tool calls per attempt. (high) = high reasoning effort.
  Success = attempt graded fully complete, of 120 (6 tasks). <span style={{ whiteSpace: 'nowrap' }}>Bold = new best.</span>
</>;
const SUCCESS_PLACE = {
  'GPT-5.6 Sol (high)': { dx: -6, dy: -14, anchor: 'start' },
  'Gemini 3.8 Flash (high)': { dx: -16, dy: 5, anchor: 'end' },
  'GPT-6 Astra (high)': { dx: -16, dy: 24, anchor: 'end' },
  'Opus 5.5 (high)': { dx: 0, dy: 22, anchor: 'middle' },
  'GPT-6 Sol (high)': { dx: 0, dy: -16, anchor: 'middle' },
  'GPT-6.1 Sol (high)': { dx: 10, dy: -16, anchor: 'end' },
};
const successPanel = {
  ...panel,
  id: 'lb-6s',
  title: 'The best LLM success rate on a real-robot benchmark rose from 1% to 13% in 2 months',
  chart: () => (
    <LogoReleaseChart wide metric="success" yMax={0.2} yTicks={[0, 0.05, 0.1, 0.15, 0.2]} place={SUCCESS_PLACE}
      keepLabels={['GPT-6 Astra (high)', 'Opus 5.5 (high)', 'GPT-6.1 Sol (high)', 'GPT-6 Sol (high)']}
      caption={SUCCESS_CAPTION} axisTitles={{ x: 'Model release date', y: 'Success rate' }}
      ariaLabel="RoboDojo-RC Tier 1 success rate (attempts graded fully complete) by model release date, July to September 2026. The best success rate rises from GPT-5.6 Sol high (0.8%, July 9) to Gemini 3.8 Flash high (13.3%, September 2); GPT-6.1 Sol high ties it at 13.3%, GPT-6 Astra high scores 12.5%, Opus 5.5 high 10.8% and GPT-6 Sol high 4.2%. Use arrow keys to step through models." />
  ),
};

// Frameless, fixed 4:5 panel; the plot takes whatever height is left. The
// drop shadow only marks the frame's edges on the page: screenshots clip to
// the frame, so it never lands in the image (user 2026-10-07).
const DRAFT_CSS = `
.rc-draft .rc-trends-title { font-family: var(--font-mono); font-stretch: normal; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; line-height: 1.2; }
.rc-draft .rc-chart-legend { gap: 6px 12px; }
.rc-draft .rc-chart-cap { font-size: 11px; line-height: 1.35; margin-top: 4px; } /* smaller than the site's 12px floor on request, to give the plot room (user 2026-10-07) */
.rc-draft .rc-chart-axistitle { font-family: var(--font-sans); font-size: 13px; font-weight: 600; fill: rgba(27,21,15,0.8); }
.rc-draft .rc-trends-panel { height: ${DRAFT_H}px; box-sizing: border-box; padding: 22px 20px 16px; gap: 12px; border: none; border-radius: 0; box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08); }
.rc-draft .rc-chart { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.rc-draft .rc-chart-plot { flex: 1; min-height: 0; height: auto; }
.rc-draft-tall .rc-trends-panel { height: 458px; padding: 16px 14px 10px; gap: 8px; }
.rc-draft-tall .rc-trends-title { font-size: 17px; }
.rc-draft-tall .rc-lbars > svg { height: 300px; }
/* 16:9 Dream-1 card (560×315 CSS, shot at 1600×900). */
.rc-draft-wide .rc-trends-panel { height: 315px; padding: 16px 20px 10px; gap: 7px; }
.rc-draft-wide .rc-trends-title { font-size: 17px; line-height: 1.18; }
.rc-draft-wide .rc-trends-body { font-size: 13px; max-width: none; }
.rc-draft-wide .rc-hbars, .rc-draft-wide .rc-lbars { flex: 1; min-height: 0; }
.rc-draft-wide .rc-lbars > svg { height: 100%; }
.rc-draft-wide .rc-hbars > svg { display: block; width: 100%; height: 100%; overflow: visible; }
.rc-hbars-name { font-family: var(--font-sans); font-size: 13px; fill: var(--neutral-900); }
.rc-hbars-effort { fill: rgba(27,21,15,0.6); }
.rc-hbars-val { font-family: var(--font-sans); font-size: 13px; font-weight: 600; fill: var(--neutral-900); }
[id^="d1-"] .rc-trends-rule { display: none; }
/* X phone pass (user 2026-10-18): cards show at ~0.85x on a phone, so chart type goes up a step. */
#d1-cost-log .rc-chart-label, #d1-time-log .rc-chart-label { font-size: 14px; }
#d1-cost-log .rc-trends-title, #d1-time-log .rc-trends-title { font-size: 21px; text-wrap: balance; } /* fill two lines evenly (user 2026-10-18) */
#d1-cost-log .rc-chart-tick, #d1-time-log .rc-chart-tick { font-size: 13px; }
#d1-cost-log .rc-chart-cap, #d1-time-log .rc-chart-cap { font-size: 12px; } /* no rule under Dream-1 titles (user 2026-10-18) */
#d1-lb .rc-lbars { margin-top: -18px; } #d1-lb .rc-lbars > svg { height: 392px; } /* Dream-1 leaderboard fills the 4:5 frame (user 2026-10-18) */
`;

// Attribution strip, Epoch AI-style: a muted wordmark bottom-left; licence
// and site, split by a hairline, bottom-right (user 2026-10-07).
const meta = { fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(27,21,15,0.6)' };
const footer = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
    <Wordmark size={18} aria-label="Robocurve" style={{ opacity: 0.4, filter: 'grayscale(1)' }} />
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={meta}>CC BY 4.0</span>
      <span aria-hidden="true" style={{ width: 1, height: 14, background: 'rgba(27,21,15,0.3)' }} />
      <span style={meta}>robocurve.org</span>
    </span>
  </div>
);

export function DraftPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--surface-page)' }}>
      <h1 className="rc-sr-only">Draft media</h1>
      {/* Title in Space Grotesk (already loaded as --font-mono): Imagin's
         high-contrast serif read poorly at X's phone size (user 2026-10-07).
         Draft only; the homepage keeps Imagin. */}
      <style>{DRAFT_CSS}</style>
      {/* Dream-1 Beta cards first (user 2026-10-18). */}
      {/* Order (user 2026-10-18): leaderboard, log-x cost and time, release; linear cost/time below. */}
      {[D1_PANELS[0], ...D1_LOG_PANELS, D1_PANELS[3], D1_PANELS[1], D1_PANELS[2]].map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft" style={{ width: DRAFT_W, marginBottom: 48 }}>
          <Panel panel={p} index={i} active footer={footer} />
        </div>
      ))}
      {/* Archived: 16:9 Dream-1 leaderboard, below the 4:5 cards (user 2026-10-18). */}
      <div className="rc-trends rc-draft rc-draft-wide" style={{ width: 560, marginBottom: 48 }}>
        <Panel panel={D1_WIDE_PANEL} index={0} active footer={footer} />
      </div>
      {/* rci-report RCI vs ECI card (user 2026-10-15). */}
      {RCI_PANELS.map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft" style={{ width: DRAFT_W, marginBottom: 48 }}>
          <Panel panel={p} index={i} active footer={footer} />
        </div>
      ))}
      {/* Gemini 4 Argon cards first (user 2026-10-14); earlier cards below.
         The tall one is the video's left panel (848×1080 when shot). */}
      <div className="rc-trends rc-draft rc-draft-tall" style={{ width: 360, marginBottom: 48 }}>
        <Panel panel={G4_VIDEO_PANEL} index={0} active footer={footer} />
      </div>
      {G4_PANELS.map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft" style={{ width: DRAFT_W, marginBottom: 48 }}>
          <Panel panel={p} index={i} active footer={footer} />
        </div>
      ))}
      <div className="rc-trends rc-draft" style={{ width: DRAFT_W }}>
        <Panel panel={panel} index={0} active footer={footer} />
      </div>
      <div className="rc-trends rc-draft" style={{ width: DRAFT_W, marginTop: 48 }}>
        <Panel panel={successPanel} index={1} active footer={footer} />
      </div>
    </main>
  );
}

// Added for the standalone replicate (entry.jsx and DraftTasksPage.jsx import the frame pieces).
export { DRAFT_CSS, DRAFT_W, DRAFT_H, footer };
