// Presentation pacing only. Existing geographic/particle phases stay in one
// reversible score, shared by autoplay and manual scrubbing.
export const STORY_DURATION = 22.1;
// The cloud rotates while gathering for four seconds; the finished globe coasts
// for one more second. The towns and retreat are concise; most of the remaining
// time belongs to the small hearts flying, colliding and reforming the globe.
const input = [0, 4, 5, 7.5, 8.12, 8.3, 13.3, 15, 15.6, 16.15, 18.3, 19, 21.9, 22.1]
  .map(seconds => seconds / STORY_DURATION);
const score = [0, .144, .18, .30, .37, .39, .64, .72, .735, .795, .87, .895, .995, 1];
const slopes = input.slice(1).map((x, i) => (score[i + 1] - score[i]) / (x - input[i]));
const tangents = input.map((_, i) => {
  // Exact linear score during the shared five-second opening: the rotation's
  // own easing determines speed, with no extra retiming at the completed globe.
  if (i <= 2) return .036 * STORY_DURATION;
  if (i === 0) return slopes[0];
  if (i === input.length - 1) return slopes[slopes.length - 1];
  const before = input[i] - input[i - 1], after = input[i + 1] - input[i];
  const a = 2 * after + before, b = after + 2 * before;
  return (a + b) / (a / slopes[i - 1] + b / slopes[i]);
});
export function toStoryProgress(value) {
  const p = Math.max(0, Math.min(1, Number(value) || 0));
  let i = 0;
  while (i < input.length - 2 && p > input[i + 1]) i++;
  const width = input[i + 1] - input[i], t = (p - input[i]) / width;
  const t2 = t * t, t3 = t2 * t;
  return (2*t3-3*t2+1)*score[i] + (t3-2*t2+t)*width*tangents[i]
    + (-2*t3+3*t2)*score[i+1] + (t3-t2)*width*tangents[i+1];
}
