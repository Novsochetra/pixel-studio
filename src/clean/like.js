import { analyze } from './analyze.js';
import { uniqueColors } from './snap.js';
import { matchHeight, scaleAxis, toRgba } from './scale.js';
import { bbox, placeLike } from './layout.js';

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
// row, body on the same column, the reference's colours (pixel_clean.py --like).
export function cleanLike(imageData, ref, options = {}) {
  if (!ref.palette.length) {
    return cleanAlone(imageData, ref.source ?? { width: ref.width, height: ref.height }, options);
  }

  const analyzed = analyze(imageData, options, ref.palette);
  const sized = matchHeight(analyzed, ref, options.height ?? null);
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

function report(analyzed, placed, scaled) {
  const box = bbox(placed.opaque, placed.width);

  return {
    cell: analyzed.cell,
    drawnHeight: scaled?.drawnHeight ?? null,
    scaled,
    size: box ? [box.right - box.left, box.bottom - box.top] : [0, 0],
    feetRow: box ? box.bottom - 1 : null,
  };
}

// With nothing to match (a first view), the cleaned sprite keeps its own colours and pixel size
// and stands on the canvas the way the front does: centred, feet a fifth of the way up.
export function cleanAlone(imageData, canvas, options = {}) {
  const analyzed = analyze(imageData, options);
  const own = bbox(analyzed.opaque, analyzed.width);

  if (!own) {
    throw new Error('no character found: the whole picture looked like background');
  }

  const feetRow = Math.round(canvas.height * 0.8);
  const tall = own.bottom - own.top;
  const wide = own.right - own.left;
  const [sx, sy] = analyzed.cell;
  // as tall as asked (or as fits above the feet), and never wider than the canvas
  const byHeight = (options.height || Math.min(tall, feetRow - 4)) / tall;
  const byWidth = (canvas.width - 2) / (wide * (sx / sy));
  const fy = Math.min(byHeight, byWidth);
  const fx = (fy * sx) / sy;
  let sprite = analyzed;
  let scaled = null;

  if (Math.abs(fy - 1) > 1e-9 || Math.abs(fx - 1) > 0.01) {
    const rows = toRgba(analyzed).subarray(
      own.top * analyzed.width * 4,
      own.bottom * analyzed.width * 4,
    );
    const out = scaleAxis(
      scaleAxis({ width: analyzed.width, height: tall, rgba: rows }, fy, 0),
      fx,
      1,
    );
    const opaque = new Uint8Array(out.width * out.height);
    const colors = new Uint8Array(out.width * out.height * 3);

    for (let i = 0; i < opaque.length; i++) {
      opaque[i] = out.rgba[i * 4 + 3] ? 1 : 0;
      colors.set(out.rgba.subarray(i * 4, i * 4 + 3), i * 3);
    }

    sprite = { width: out.width, height: out.height, colors, opaque };
    scaled = { fx, fy, drawnHeight: tall };
  }

  const stand = {
    width: canvas.width,
    height: canvas.height,
    opaque: new Uint8Array(canvas.width * canvas.height),
  };
  stand.opaque[feetRow * canvas.width + Math.floor(canvas.width / 2)] = 1;
  const placed = placeLike(sprite, stand);

  return { ...placed, report: { ...report(analyzed, placed, scaled), alone: true } };
}
