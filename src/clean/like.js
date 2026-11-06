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

function fitsBeside(sprite, ref) {
  const box = bbox(sprite.opaque, sprite.width);
  const refBox = bbox(ref.opaque, ref.width);

  return box.bottom - box.top <= refBox.bottom && box.right - box.left <= ref.width;
}

// Later frames of an animation keep their own pixel size, so a crouch does not grow to standing
// height; one too big to stand on the canvas that way is matched to the reference instead, rather
// than cut off.
function sizeLike(analyzed, ref, options) {
  if (options.keepScale) {
    const kept = keepPixelSize(analyzed);

    if (fitsBeside(kept, ref)) {
      return { sized: kept, kept: true, tooBig: false };
    }
  }

  return {
    sized: matchHeight(analyzed, ref, options.height ?? null),
    kept: false,
    tooBig: Boolean(options.keepScale),
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
  const { sized, kept, tooBig } = sizeLike(analyzed, ref, options);
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
      kept,
      tooBig,
    },
  };
}
