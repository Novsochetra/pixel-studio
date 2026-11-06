// What a number field holds, as a whole number from min to max; text that is no number gives
// fallback.
export function wholeNumber(text, { min, max, fallback = min }) {
  const value = Math.round(Number(text));

  if (!text || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}
