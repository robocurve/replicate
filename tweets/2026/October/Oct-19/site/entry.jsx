/* Mounts the Dream-1 "score vs time" X card alone, exactly as the /draft/ page
   framed it (420x525 CSS, shot at 1200/420 DPR by shot.mjs). */
import { createRoot } from 'react-dom/client';
import { Panel } from './src/Trends.jsx';
import { D1_LOG_PANELS } from './src/Dream1Cards.jsx';
import { DRAFT_CSS, DRAFT_W, footer } from './src/DraftPage.jsx';

const panel = D1_LOG_PANELS.find((p) => p.id === 'd1-time-log');

function Card() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--surface-page)' }}>
      <style>{DRAFT_CSS}</style>
      <div className="rc-trends rc-draft" style={{ width: DRAFT_W }}>
        <Panel panel={panel} index={0} active footer={footer} />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Card />);
