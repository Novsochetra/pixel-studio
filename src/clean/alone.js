import { analyze } from './analyze.js';
import { fromRgba, scaleAxis, toRgba } from './scale.js';
import { bbox, placeLike, shiftInto } from './layout.js';

// How much to scale a picture with nothing to match. Tiles fill the canvas exactly; anything else
// keeps its own pixel size unless a height is asked for or it does not fit, and keeps the image's
// pixel shape (sx by sy) square.
function factors(own, canvas, options, cell) {
  const tall = own.bottom - own.top;
  const wide = own.right - own.left;

  if (options.place === 'fill') {
    return { fx: canvas.width / wide, fy: canvas.height / tall };
  }

  const [sx, sy] = cell;
  const room = options.place === 'centre' ? canvas.height - 2 : groundRow(canvas, options) - 4;
  const byHeight = (options.height || Math.min(tall, room)) / tall;
  const byWidth = (canvas.width - 2) / (wide * (sx / sy));
  const fy = Math.min(byHeight, byWidth);

  return { fx: (fy * sx) / sy, fy };
}

const groundRow = (canvas, options) => Math.round(canvas.height * (options.ground ?? 0.8));

// a fill is cut to the art on both sides, so its edges meet the canvas's
function scaled(analyzed, own, { fx, fy }, fill) {
  const left = fill ? own.left : 0;
  const width = fill ? own.right - own.left : analyzed.width;
  const rgba = toRgba(analyzed);
  const rows = new Uint8ClampedArray(width * (own.bottom - own.top) * 4);

  for (let y = own.top; y < own.bottom; y++) {
    const from = (y * analyzed.width + left) * 4;
    rows.set(rgba.subarray(from, from + width * 4), (y - own.top) * width * 4);
  }

  const out = scaleAxis(
    scaleAxis({ width, height: own.bottom - own.top, rgba: rows }, fy, 0),
    fx,
    1,
  );

  return fromRgba(out);
}

function place(sprite, canvas, options) {
  if (options.place === 'fill') {
    return shiftInto(sprite, canvas, 0, 0);
  }

  if (options.place === 'centre') {
    const box = bbox(sprite.opaque, sprite.width);
    const dx = Math.floor((canvas.width - (box.right - box.left)) / 2) - box.left;
    const dy = Math.floor((canvas.height - (box.bottom - box.top)) / 2) - box.top;

    return shiftInto(sprite, canvas, dx, dy);
  }

  const stand = { ...canvas, opaque: new Uint8Array(canvas.width * canvas.height) };
  stand.opaque[groundRow(canvas, options) * canvas.width + Math.floor(canvas.width / 2)] = 1;

  return placeLike(sprite, stand);
}

function report(analyzed, placed, scaledBy) {
  const box = bbox(placed.opaque, placed.width);

  return {
    cell: analyzed.cell,
    drawnHeight: scaledBy?.drawnHeight ?? null,
    scaled: scaledBy,
    size: box ? [box.right - box.left, box.bottom - box.top] : [0, 0],
    feetRow: box ? box.bottom - 1 : null,
    alone: true,
  };
}

// With nothing to match (a first view, an effect, a tile), the cleaned picture keeps its own
// colours and stands where its kind does: on the ground line (options.place 'feet', at
// options.ground of the height), in the middle ('centre') or filling the canvas ('fill').
export function cleanAlone(imageData, canvas, options = {}) {
  const analyzed = analyze(imageData, options);
  const own = bbox(analyzed.opaque, analyzed.width);

  if (!own) {
    throw new Error('nothing found: the whole picture looked like background');
  }

  const by = factors(own, canvas, options, analyzed.cell);
  const unchanged = Math.abs(by.fy - 1) <= 1e-9 && Math.abs(by.fx - 1) <= 0.01;
  const sprite = unchanged ? analyzed : scaled(analyzed, own, by, options.place === 'fill');
  const placed = place(sprite, canvas, options);
  const scaledBy = unchanged ? null : { ...by, drawnHeight: own.bottom - own.top };

  return { ...placed, report: report(analyzed, placed, scaledBy) };
}
