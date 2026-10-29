// Instruction rules shown to candidates. The duration rule is computed from config,
// and any stale hard-coded duration rule (old persisted configs) is dropped.
const STALE_DURATION_RULE = /^Total duration is \d+ minutes/i;

export function buildRules(config) {
  const rules = (config.instructions ?? []).filter((r) => !STALE_DURATION_RULE.test(r));
  const duration = `Total duration is ${config.totalTimeMinutes} minutes. The exam will auto-submit when time expires.`;
  // Keep it right after the first (question count) rule
  return [...rules.slice(0, 1), duration, ...rules.slice(1)];
}
