// Weighted anti-cheat risk scoring (FR-AC-06).
export function computeRisk(violationCounts, questionTimes = {}, answeredIds = []) {
  const count = (key) => violationCounts?.[key] ?? 0;
  const score = 2 * count('tab')
    + 2 * count('fullscreenExit')
    + 3 * count('devtools')
    + count('copy') + count('paste') + count('cut')
    + 0.5 * (count('rightClick') + count('blockedKey'));
  const level = score < 4 ? 'low' : score < 10 ? 'medium' : 'high';
  const fastCount = answeredIds.filter((id) => questionTimes[id] < 3).length;
  return { score, level, fastAnswers: answeredIds.length > 0 && fastCount / answeredIds.length > 0.3 };
}
