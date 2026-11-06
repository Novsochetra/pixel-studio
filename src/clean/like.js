import { analyze } from './analyze.js';
import { uniqueColors } from './snap.js';
import { keepPixelSize, matchHeight } from './scale.js';
import { bbox, placeLike } from './layout.js';
import { cleanAlone } from './alone.js';

export { cleanAlone };

export function analyzeReference(refData, options = {}) {
  const ref = analyze(refData, {
    ...options,
    cell: null,
    native: null,
    background: null,
    keepBackground: false,
  });

  return {
    ...ref,
    source: { width: refData.width, height: refData.height },
    palette: uniqueColors(ref.colors, ref.opaque).map((entry) => entry.color),
  };
}

// Lays a new view out exactly like the reference: same canvas, same pixel size, feet on the same
// row, body on the same column, the reference's colours (pixel_clean.py --like). With
// options.keepScale the picture keeps its own height instead of taking the reference's.
export function cleanLike(imageData, ref, options = {}) {
  if (!ref.palette.length) {
    return cleanAlone(imageData, ref.source ?? { width: ref.width, height: ref.height }, options);
  }

  const analyzed = analyze(imageData, options, ref.palette);
  // later frames of an animation keep their own pixel size: a crouch must not grow to standing height
  const sized = options.keepScale
    ? keepPixelSize(analyzed)
    : matchHeight(analyzed, ref, options.height ?? null);
  const placed = placeLike(sized, ref);
  const box = bbox(placed.opaque, placed.width);

  return {
    ...placed,
    report: {
      cell: analyzed.cell,
      drawnHeight: sized.scaled?.drawnHeight ?? null,
      scaled: sized.scaled,
      size: box ? [box.right - box.left, box.bottom - box.top] : [0, 0],
      feetRow: box ? box.bottom - 1 : null,
    },
  };
}
