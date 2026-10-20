/* RoboDojo-RC Tier 1 model results shared by the leaderboard charts
   (ParetoChart for cost and time, ReleaseChart, hero LeaderboardBars).
   Units are per TASK ATTEMPT: mean score over task attempts, mean cost
   (USD) and wall-clock minutes per attempt.
   Sources, newest first:
   - `lb`: Robocurve’s leaderboard data (working draft, snapshot
     Sep 29 2026 2:30 PM PDT; assets/data/robocurve-leaderboard.json):
     20 six-task trials per model at high effort; its six-task sums are
     divided by 6 here. It supersedes the report for the configs it covers.
   - `report`: the GPT-6 Sol RoboDojo-RC Tier 1 report's trials
     (reports/gpt-6-sol-robodojo-rc-tier-1/data/all-trials.csv), 120
     attempts per config, for the configs the leaderboard doesn't run.
     Opus 5 (medium) was withdrawn 2026-10-06: a rig config error (wrist
     pitch/roll pinned) invalidated its runs.
   Release dates: GPT-5.6 Sol from the Artificial Analysis
   snapshot in robocurve/llm-token-speed; GPT-6 Astra from OpenAI's
   announcement (Thu 2026-09-03, social/posts/2026-09-gpt-6-astra-results);
   Opus 5.5 from anthropic.com/claude-opus-5-5 (2026-09-22); GPT-6 Sol from
   openai.com/index/introducing-gpt-6-sol-and-luna (2026-09-23).
   Colour follows the lab (pair validated on the panel surface); OpenAI
   models also carry their family glyph (Sol = sun, Astra = star; Luna
   would be a moon); identity is carried by direct labels. */

import React from 'react';
import LEADERBOARD from '../assets/data/robocurve-leaderboard.json';

export const LAB = { anthropic: '#C4552B', openai: '#2E6DB4', google: '#278343' };
// VLA labs (/draft/ Dream-1 Beta cards, user 2026-10-18): drawn via `models` props only, never in MODELS,
// so the site's per-lab frontiers stay the three LLM labs.
export const VLA_LAB = { nvidia: '#5E9400', dreamlabs: '#FFB06C' };
export const LAB_NAME = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google' };
// [label, lab, score (0–1), USD / attempt, minutes / attempt, released, source, n attempts, service mode]
// Service mode: the September 29 leaderboard ran in Fast mode; the report ran
// high effort in Fast and medium in standard. 'ultrafast' is supported for
// when such a config is tested (none yet). Gemini uses standard mode.
export const MODELS = [
  ['GPT-6 Astra (high)', 'openai', 0.4253, 3.484, 3.96, '2026-09-03', 'lb', 120, 'fast'],
  ['Opus 5.5 (high)', 'anthropic', 0.3822, 2.234, 3.10, '2026-09-22', 'lb', 120, 'fast'],
  ['GPT-6 Astra (medium)', 'openai', 0.3669, 1.138, 4.18, '2026-09-03', 'report', 120, 'standard'],
  ['Opus 5.5 (medium)', 'anthropic', 0.3601, 0.898, 4.48, '2026-09-22', 'report', 120, 'standard'],
  ['GPT-6 Sol (high)', 'openai', 0.2198, 0.949, 3.74, '2026-09-23', 'lb', 120, 'fast'],
  ['GPT-5.6 Sol (high)', 'openai', 0.1489, 1.768, 3.64, '2026-07-09', 'lb', 120, 'fast'],
].map(([name, lab, score, cost, mins, released, src, n, mode]) => ({ name, lab, score, cost, mins, released, src, n, mode }));

// Added cohort uses the same imported summary as the hero bar, without rounding.
const sol61 = LEADERBOARD.models.find((m) => m.name === 'GPT-6.1 Sol');
MODELS.push({ name: 'GPT-6.1 Sol (high)', lab: 'openai', score: sol61.score / 100,
  cost: sol61.cost_usd / 6, mins: sol61.minutes, released: '2026-09-29',
  src: 'sol61-capability-2026-10-02', n: sol61.n_attempts, mode: sol61.mode });

// Same selected cohort and unrounded summary as the capability leaderboard.
// Release: https://ai.google.dev/gemini-api/docs/changelog#september-2-2026
const gemini = LEADERBOARD.models.find((m) => m.name === 'Gemini 3.8 Flash');
MODELS.push({ name: 'Gemini 3.8 Flash (high)', lab: 'google', score: gemini.score / 100,
  cost: gemini.cost_usd / 6, mins: gemini.minutes, released: '2026-09-02',
  src: 'gemini-capability-2026-10-01', n: gemini.n_attempts, mode: gemini.mode });

// Gemini 4 Argon (high, Priority tier) (user 2026-10-14): workbench set
// "capabilities - Gemini 4 Argon - RoboDojo - high" on omen, snapshot after
// the 2026-10-14 regrades. The rig dashboard's Final Runs (overheat-ended runs
// kept; LLM-timeout trials scored 0, grading N/A), human label over
// autograde, last 20 per task = 120 attempts; 21 fully complete.
// Keys: ~/robocurve/gemini4-plots/data/g4-selected-120.json. Cost at Priority-tier launch prices
// ($3.60 / $18 per M tokens, $0.18 cached). Runs and README:
// ~/robocurve/gemini4-plots/. Release: Gemini API changelog, 2026-10-13.
MODELS.push({ name: 'Gemini 4 Argon (high)', lab: 'google', score: 0.4823, cost: 2.342, mins: 20.49,
  released: '2026-10-13', src: 'gemini4-capability-2026-10-14', n: 120, mode: 'priority' });

// Success rate: share of the 120 attempts graded fully complete (score 1),
// counted from each configuration's exact cohort in data/all-runs.json
// (replacements included, as in the mean). Checked by
// test/success-rate.test.mjs; update both when a cohort changes.
export const SUCCESS = {
  'GPT-6 Astra (high)': [15, 120],
  'Opus 5.5 (high)': [13, 120],
  'GPT-6 Astra (medium)': [5, 120],
  'Opus 5.5 (medium)': [1, 120],
  'GPT-6 Sol (high)': [5, 120],
  'GPT-5.6 Sol (high)': [1, 120],
  'GPT-6.1 Sol (high)': [16, 120],
  'Gemini 3.8 Flash (high)': [16, 120],
  'Gemini 4 Argon (high)': [21, 120],
};
MODELS.forEach((m) => { const [k, n] = SUCCESS[m.name]; m.success = k / n; });

// Display label with the service-mode suffix — e.g. 'GPT-6 Sol (high) (fast)';
// standard mode gets none.
export const withMode = (m) => (m.mode && m.mode !== 'standard' ? `${m.name} (${m.mode})` : m.name);

// OpenAI's GPT-6 family glyphs (Sol = sun, Astra = star — as in the report
// video; Luna would be a moon); Anthropic models stay dots.
export const glyph = (name) => (/Astra/.test(name) ? 'star' : /Sol/.test(name) ? 'sun' : 'dot');
function starPoints(cx, cy, ro, ri) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}
export function Marker({ kind, cx, cy, color, big }) {
  const k = big ? 1.15 : 1;
  if (kind === 'star') {
    return <polygon points={starPoints(cx, cy, 8.5 * k, 3.6 * k)} fill={color} stroke="var(--surface-float)" strokeWidth={1.5} strokeLinejoin="round" />;
  }
  if (kind === 'sun') {
    // Low-key sun: a small core and eight short hairline rays.
    return (
      <g>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={cx + 5 * k * Math.cos(a)} y1={cy + 5 * k * Math.sin(a)} x2={cx + 6.8 * k * Math.cos(a)} y2={cy + 6.8 * k * Math.sin(a)} stroke={color} strokeWidth={1} strokeLinecap="round" />;
        })}
        <circle cx={cx} cy={cy} r={3.3 * k} fill={color} />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={big ? 6 : 5} fill={color} stroke="var(--surface-float)" strokeWidth={2} />;
}
// Product marks (Simple Icons, 24×24): GPT = the OpenAI knot, Claude's
// spark, Gemini's sparkle — the logo-marker variant of the release chart.
const LOGO = {
  nvidia: 'M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z',
  openai: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
  anthropic: 'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z',
  google: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
};
// Brand colours, not the lab palette: OpenAI black, Claude's clay, and
// Gemini's blue → purple → rose gradient (user 2026-10-05).
const LOGO_FILL = { openai: '#000000', anthropic: '#D97757', nvidia: '#76B900' };
const GEMINI_STOPS = [['0%', '#4796E3'], ['55%', '#9177C7'], ['100%', '#CA6673']];
// Lab-coloured model names (ReleaseChart `colorLabels`, frontier models
// only; off-frontier names stay grey): darker tones of the lab hues so text
// clears 4.5:1 on the panel; OpenAI is ink.
// The legend names and the logo badges' rings use the same colours there,
// except Gemini's ring, which keeps its gradient (green clashed with it).
export const LABEL_INK = { anthropic: '#9C3D1B', google: '#1F6B36', openai: '#1B150F', ai2: '#B8326E', nvidia: '#4A7500', dreamlabs: '#A8560F' };

// Ai2's pinwheel (MolmoAct2, /draft/ Gemini 4 time card), from LeaderboardBars' AI2_MARK.
const AI2 = { d: 'M82,85.6h-41v-39h33c4.4,0,8-3.6,8-8V5.6h39v41c0,21.6-17.5,39-39,39ZM41,89.6H0v39h33c4.4,0,8,3.6,8,8v33h39v-41c0-21.6-17.5-39-39-39ZM172.1,87.6c-4.4,0-8-3.6-8-8v-33h-39v41c0,21.6,17.5,39,39,39h41v-39h-33ZM84,169.6v41h39v-33c0-4.4,3.6-8,8-8h33v-39h-41c-21.6,0-39,17.5-39,39Z', viewBox: '0 0 213.1 210.7', fill: '#F45096' };
export function LogoMarker({ lab, cx, cy, big, ring }) {
  const gid = `rc-gemini-${React.useId().replace(/:/g, '')}`;
  const s = big ? 13 : 11;
  // Dream Labs: its X avatar (@dreamlabs_ai, cream cloud on creamsicle),
  // clipped to the badge circle (assets/logo/dreamlabs-avatar.png).
  if (lab === 'dreamlabs') {
    const r = s / 2 + 3.5, cid = `${gid}-dl`;
    return (
      <g>
        <defs><clipPath id={cid}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
        <image href="/assets/logo/dreamlabs-avatar.png" x={cx - r} y={cy - r} width={2 * r} height={2 * r} clipPath={`url(#${cid})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C97A35" strokeWidth={big ? 1.75 : 1} />
      </g>
    );
  }
  if (lab === 'ai2') return (
    <g>
      <circle cx={cx} cy={cy} r={s / 2 + 3.5} fill="#fff" stroke={AI2.fill} strokeWidth={big ? 1.75 : 1} />
      <svg x={cx - s / 2} y={cy - s / 2} width={s} height={s} viewBox={AI2.viewBox}><path d={AI2.d} fill={AI2.fill} /></svg>
    </g>
  );
  return (
    <g>
      {lab === 'google' && (
        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          {GEMINI_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient></defs>
      )}
      {/* White badge ringed in the logo's own colour; frontier points get a
         heavier ring. */}
      <circle cx={cx} cy={cy} r={s / 2 + 3.5} fill="#fff" stroke={lab === 'google' ? `url(#${gid})` : ring || LOGO_FILL[lab]} strokeWidth={big ? 1.75 : 1} />
      <svg x={cx - s / 2} y={cy - s / 2} width={s} height={s} viewBox="0 0 24 24" overflow="visible">
        <path d={LOGO[lab]} fill={lab === 'google' ? `url(#${gid})` : LOGO_FILL[lab]} />
      </svg>
    </g>
  );
}
export function LegendGlyph({ kind, color, lab, ring }) {
  if (lab) return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><LogoMarker lab={lab} cx={11} cy={11} ring={ring} /></svg>;
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><Marker kind={kind} cx={9} cy={9} color={color} /></svg>;
}
