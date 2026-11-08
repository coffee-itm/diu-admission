// Weighted anti-cheat risk scoring (FR-AC-06).
/** questionTimes contains per-question elapsed times in milliseconds. */
export function computeRisk(violationCounts, questionTimes = {}, answeredIds = []) {
  const count = (key) => violationCounts?.[key] ?? 0;
  const score = 2 * count('tabSwitch')
    + 2 * count('fullscreenExit')
    + 3 * count('devtools')
    + count('copy') + count('paste') + count('cut')
    + 0.5 * (count('rightClick') + count('blockedKey'));
  const level = score < 4 ? 'low' : score < 10 ? 'medium' : 'high';
  const fastCount = answeredIds.filter((id) => questionTimes[id] < 3000).length;
  return { score, level, fastAnswers: answeredIds.length > 0 && fastCount / answeredIds.length > 0.3 };
}
