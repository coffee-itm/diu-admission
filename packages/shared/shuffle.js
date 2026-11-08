/**
 * Fisher–Yates shuffle. Returns a new array; the input is not mutated.
 *
 * @param {Array} arr
 * @param {() => number} [rng=Math.random] - returns a float in [0, 1)
 */
export function shuffle(arr, rng = Math.random) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
