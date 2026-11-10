// What a number field holds, as a whole number from min to max; text that is no number gives
// fallback.
export function wholeNumber(text, { min, max, fallback = min }) {
  const value = Math.round(Number(text));

  if (!text || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}

// what is typed is a whole number from min to max: said before it is used, where a number
// quietly brought into range would do something nobody asked for
export const isWholeBetween = (text, { min, max }) =>
  /^\d+$/.test(text.trim()) && Number(text) >= min && Number(text) <= max;
