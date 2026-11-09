/* Mounts the four 5:4 Franka Panda cards (KIN_WIDE54_PANELS, ids kw-*) exactly as the website's unlisted /draft/
   page framed them: 580x464 CSS each, shot at 1600/580 DPR by shot.mjs. The CSS and small footer below are copied
   from src/DraftPage.jsx of robocurve/website (commit 3522088, branch kinematics-draft). */
import { createRoot } from 'react-dom/client';
import { Panel } from './src/Trends.jsx';
import { KIN_WIDE54_PANELS } from './src/KinematicsCards.jsx';
import { Wordmark } from './src/components/Wordmark.jsx';

const DRAFT_CSS = `
.rc-draft .rc-trends-title { font-family: var(--font-mono); font-stretch: normal; font-weight: 700; font-size: 18px; letter-spacing: -0.02em; line-height: 1.2; }
.rc-draft .rc-chart-legend { gap: 6px 12px; }
.rc-draft .rc-chart-cap { font-size: 11px; line-height: 1.35; margin-top: 4px; }
.rc-draft .rc-chart-axistitle { font-family: var(--font-sans); font-size: 13px; font-weight: 600; fill: rgba(27,21,15,0.8); }
.rc-draft .rc-trends-panel { height: 525px; box-sizing: border-box; padding: 22px 20px 16px; gap: 12px; border: none; border-radius: 0; box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08); }
.rc-draft .rc-chart { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.rc-draft .rc-chart-plot { flex: 1; min-height: 0; height: auto; }
.rc-draft-11 .rc-trends-panel { height: 520px; padding: 14px 14px 8px; gap: 8px; }
.rc-draft-11 .rc-trends-title { font-family: var(--font-sans); font-weight: 700; letter-spacing: -0.01em; font-size: 16px; white-space: nowrap; }
.rc-draft-54 .rc-trends-panel { height: 464px; padding: 14px 12px 8px; }
`;
const metaSm = { fontFamily: 'var(--font-sans)', fontSize: 8, color: 'rgba(27,21,15,0.6)' };
const footerSm = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
    <Wordmark size={11} aria-label="Robocurve" style={{ opacity: 0.4, filter: 'grayscale(1)' }} />
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={metaSm}>CC BY 4.0</span>
      <span aria-hidden="true" style={{ width: 1, height: 9, background: 'rgba(27,21,15,0.3)' }} />
      <span style={metaSm}>robocurve.org</span>
    </span>
  </div>
);

function Cards() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--surface-page)' }}>
      <style>{DRAFT_CSS}</style>
      {KIN_WIDE54_PANELS.map((p, i) => (
        <div key={p.id} className="rc-trends rc-draft rc-draft-11 rc-draft-54" style={{ width: 580, marginBottom: 48 }}>
          <Panel panel={p} index={i} active footer={footerSm} />
        </div>
      ))}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Cards />);
