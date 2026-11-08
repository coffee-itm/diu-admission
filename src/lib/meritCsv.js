import { formatTime } from './utils.js';
import { SECTION_ORDER } from './constants.js';

const pad = (n) => String(n).padStart(2, '0');
function fmtStamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const MERIT_COLUMNS = [
  { header: 'rank', value: (r) => r.rank },
  { header: 'name', value: (r) => r.candidateName },
  { header: 'email', value: (r) => r.candidateEmail },
  { header: 'phone', value: (r) => r.phone ?? '' },
  { header: 'program', value: (r) => r.program ?? '' },
  { header: 'total_score', value: (r) => r.totalScore },
  { header: 'percentage', value: (r) => r.percentage },
  ...SECTION_ORDER.map((id) => ({
    header: `${id.toLowerCase()}_pct`,
    value: (r) => r.sectionPercentages?.[id] ?? '',
  })),
  { header: 'eligibility', value: (r) => r.eligibility },
  { header: 'time_taken', value: (r) => formatTime(r.timeTaken ?? 0) },
  { header: 'submitted_at', value: (r) => fmtStamp(r.submittedAt) },
];

/** Join merit items with candidate records (by candidateId) for phone/program. */
export function buildMeritRows(meritList, candidates) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  return meritList.map((r, i) => {
    const c = byId.get(r.candidateId);
    return {
      ...r,
      rank: r.rank ?? i + 1,
      phone: c?.phone ?? r.candidatePhone ?? '',
      program: c?.program ?? r.programCode ?? '',
    };
  });
}

export const MERIT_ELIGIBILITY_FILTERS = [
  { value: 'eligible_conditional', label: 'Eligible + Conditional' },
  { value: 'ELIGIBLE', label: 'Eligible only' },
  { value: 'CONDITIONALLY_ELIGIBLE', label: 'Conditionally eligible only' },
  { value: 'NOT_ELIGIBLE', label: 'Not eligible only' },
  { value: 'all', label: 'All candidates' },
];

export const DEFAULT_MERIT_FILTER = 'eligible_conditional';

/**
 * Hide rows the admin doesn't want to see. Ranks were computed on the full list,
 * so filtering never re-ranks: a row keeps its original rank number.
 */
export function filterMeritByEligibility(list, filter = DEFAULT_MERIT_FILTER) {
  if (filter === 'all') return list;
  if (filter === DEFAULT_MERIT_FILTER || !filter) {
    return list.filter((r) => r.eligibility === 'ELIGIBLE' || r.eligibility === 'CONDITIONALLY_ELIGIBLE');
  }
  return list.filter((r) => r.eligibility === filter);
}
