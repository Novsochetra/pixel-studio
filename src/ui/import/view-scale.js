// How much a view's pictures are scaled to stand as tall as the reference: kept from the one that
// was matched to it, for the frames of that view cleaned after. A later frame keeps its own pose's
// size, so a crouch stays a crouch; left at its own pixels, though, a view whose pictures are
// drawn smaller than the reference's came out small beside its first frame.
const NEARLY_ONE = 0.05;

export const scaleOf = (scales, direction) => scales?.[direction] ?? 1;

// the view's scale after this picture: one matched to the reference says what it is
export const scalesAfter = (scales, direction, report) =>
  report.kept ? { ...scales } : { ...scales, [direction]: report.scaled?.fy ?? 1 };

// clean(options) cleans the picture; a later frame that kept its own size is cleaned again at
// that size times the view's scale
export async function cleanAtViewScale(clean, options, factor) {
  const result = await clean(options);

  if (!options.keepScale || !result.report.kept || Math.abs(factor - 1) < NEARLY_ONE) {
    return result;
  }

  const height = Math.round(result.report.size[1] * factor);

  return clean({ ...options, keepScale: false, height });
}
