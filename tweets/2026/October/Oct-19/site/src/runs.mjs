/* URL and filtering rules shared by the runs explorer and its entry links.
   OR within a field, AND across fields. Empty selections mean all values. */
export const BENCHMARKS = { 'robodojo-rc-tier-1': 'RoboDojo-RC Tier 1', 'roboharm-v1': 'RoboHarm v1', 'simple-tasks': 'Simple tasks' };
export const MODEL_NAMES = { 'gpt-6-astra': 'GPT-6 Astra', 'gpt-6-sol': 'GPT-6 Sol', 'gpt-6.1-sol': 'GPT-6.1 Sol', 'gpt-5.6-sol': 'GPT-5.6 Sol', 'claude-opus-5-5': 'Opus 5.5', 'claude-opus-5': 'Opus 5', 'claude-fable-5-1': 'Fable 5.1', 'gemini-3.8-flash': 'Gemini 3.8 Flash', 'claude-haiku-5-5': 'Haiku 5.5', 'claude-haiku-4-5-20251001': 'Haiku 4.5', 'gpt-6-luna': 'GPT-6 Luna', 'gemini-4-argon': 'Gemini 4 Argon' };
// Effort values that are not a plain API effort level.
export const EFFORTS = { 'budget-8k': '8K thinking budget' };
export const OUTCOMES = {
  zero: 'Zero progress', partial: 'Partial progress', complete: 'Complete',
  refused: 'Refused (safety)', refused_capability: 'Refused (non-safety)', invalid: 'No meaningful attempt',
  attempted_failed: 'Attempted, failed', attempted_succeeded: 'Harm threshold crossed', guardrail_blocked: 'Provider guardrail block',
};
export const LEADERBOARDS = { capability: 'Robot-task performance', safety: 'Harmful-instruction refusal', pareto: 'Robotics Pareto plots', 'doll-study': 'Baby doll: wrapped vs unwrapped', 'haiku-simple': 'Simple tasks: Haiku and GPT-6 Astra', 'luna-thinking': 'Thinking levels: Haiku 5.5 and GPT-6 Luna', 'opus5-clean': 'Opus 5 (medium): re-cleared runs', 'gemini-4-argon': 'Gemini 4 Argon (high, Priority)' };
export const FIELDS = [
  ['leaderboard', 'Leaderboard'],
  ['benchmark', 'Benchmark'], ['model', 'Model'], ['task', 'Task'], ['scene', 'Scene'], ['effort', 'Effort'], ['mode', 'Service mode'], ['control', 'Control'], ['outcome', 'Outcome'],
];
export const valueLabel = (field, value) => value == null ? '' : (field === 'leaderboard' ? LEADERBOARDS[value] : field === 'benchmark' ? BENCHMARKS[value] : field === 'model' ? MODEL_NAMES[value] : field === 'outcome' ? OUTCOMES[value] : field === 'effort' ? EFFORTS[value] : null)
  || (value === 'joint-position' ? 'Joint position' : value === 'end-effector' ? 'End effector' : value === 'not-recorded' ? 'Not recorded' : value.charAt(0).toUpperCase() + value.slice(1));
export const emptyFilters = () => Object.fromEntries([...FIELDS.map(([key]) => [key, []]), ['q', '']]);
export function readFilters(search) {
  const params = new URLSearchParams(search);
  return { ...Object.fromEntries(FIELDS.map(([key]) => [key, [...new Set(params.getAll(key).filter(Boolean))]])), q: params.get('q') || '' };
}
export function filterQuery(filters) {
  const params = new URLSearchParams();
  FIELDS.forEach(([key]) => [...filters[key]].sort().forEach((value) => params.append(key, value)));
  if (filters.q.trim()) params.set('q', filters.q.trim());
  return params.toString();
}
export const runsHref = (values) => `/all-runs/?${filterQuery({ ...emptyFilters(), ...values })}`;
export const CAPABILITY_RUNS = runsHref({ benchmark: ['robodojo-rc-tier-1'], leaderboard: ['capability'] });
export const PARETO_RUNS = runsHref({ benchmark: ['robodojo-rc-tier-1'], leaderboard: ['pareto'] });
export const SAFETY_RUNS = runsHref({ benchmark: ['roboharm-v1'], leaderboard: ['safety'] });
export const DOLL_STUDY_RUNS = runsHref({ leaderboard: ['doll-study'] });
export const HAIKU_SIMPLE_RUNS = runsHref({ leaderboard: ['haiku-simple'] });
export const LUNA_THINKING_RUNS = runsHref({ leaderboard: ['luna-thinking'] });
export const OPUS5_CLEAN_RUNS = runsHref({ leaderboard: ['opus5-clean'] });
export const GEMINI4_ARGON_RUNS = runsHref({ leaderboard: ['gemini-4-argon'] });
export function filterRuns(runs, filters) {
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return runs.filter((run) => FIELDS.every(([key]) => !filters[key].length || (Array.isArray(run[key]) ? run[key].some((value) => filters[key].includes(value)) : filters[key].includes(run[key])))
    && words.every((word) => `${run.run} ${run.task} ${MODEL_NAMES[run.model]} ${BENCHMARKS[run.benchmark]}`.toLowerCase().includes(word)));
}
export function groupRuns(runs, fields = ['benchmark', 'task', 'configuration'], parents = []) {
  if (!fields.length) return runs;
  const [field, ...rest] = fields;
  const groups = new Map();
  for (const run of runs) {
    const value = field === 'configuration' ? JSON.stringify([run.model, run.effort, run.mode, run.scene || null]) : run[field];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(run);
  }
  return [...groups].map(([value, rows]) => {
    const path = [...parents, value];
    const label = field === 'configuration'
      ? `${MODEL_NAMES[rows[0].model]} (${EFFORTS[rows[0].effort] || rows[0].effort})${rows[0].mode === 'fast' ? ' · Fast' : rows[0].mode === 'standard' ? ' · Standard' : ''}${rows[0].scene ? ` · ${valueLabel('scene', rows[0].scene)}` : ''}`
      : valueLabel(field, value);
    return { id: JSON.stringify(path), label, level: parents.length, rows, children: groupRuns(rows, rest, path), leaf: !rest.length };
  });
}
export function groupIds(groups) {
  return groups.flatMap((group) => [group.id, ...(!group.leaf ? groupIds(group.children) : [])]);
}
export function orderedRuns(runs, membership) {
  const trial = (run) => membership ? (run.trials?.[membership] ?? run.trial) : 0;
  return [...runs].sort((a, b) => trial(a) - trial(b) || (a.date || '').localeCompare(b.date || '') || a.id.localeCompare(b.id));
}
export function csvForRuns(runs) {
  const fields = ['benchmark', 'leaderboard', 'model', 'task', 'scene', 'effort', 'mode', 'control', 'run', 'trial', 'trials', 'date', 'score', 'outcome', 'cost', 'minutes', 'calls', 'tokens', 'grading', 'source', 'log'];
  const cell = (value) => {
    let text = value == null ? '' : Array.isArray(value) ? value.join(';') : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [fields.map(cell).join(','), ...runs.map((run) => fields.map((key) => cell(run[key])).join(','))].join('\r\n');
}
