import { roundHalfEven } from './numeric.js';
import { bbox } from './layout.js';

function pixel(rgba, width, height, axis, line, across) {
  const [x, y] = axis === 0 ? [across, line] : [line, across];

  if (line < 0 || line >= (axis === 0 ? height : width)) {
    return [0, 0, 0, 0];
  }

  const at = (y * width + x) * 4;

  return [rgba[at], rgba[at + 1], rgba[at + 2], rgba[at + 3]];
}

const differ = (a, b) => a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3];

// Nearest-neighbour stretch along one axis that keeps 1-pixel lines 1 pixel: where a source pixel
// is drawn twice and it is a line (unlike both neighbours), the second copy takes the next pixel's
// colour instead, so outlines and trims don't double.
export function scaleAxis({ width, height, rgba }, factor, axis) {
  const n = axis === 0 ? height : width;
  const across = axis === 0 ? width : height;
  const count = roundHalfEven(n * factor);
  const pick = Array.from({ length: count }, (_, i) => Math.min(Math.trunc((i + 0.5) / factor), n - 1));
  const out = { width: axis === 0 ? width : count, height: axis === 0 ? count : height };
  out.rgba = new Uint8Array(out.width * out.height * 4);

  pick.forEach((k, i) => {
    const doubled = i > 0 && pick[i - 1] === k && k + 1 < n;

    for (let a = 0; a < across; a++) {
      const own = pixel(rgba, width, height, axis, k, a);
      const thin =
        doubled &&
        differ(own, pixel(rgba, width, height, axis, k - 1, a)) &&
        differ(own, pixel(rgba, width, height, axis, k + 1, a));
      const value = thin ? pixel(rgba, width, height, axis, k + 1, a) : own;
      const [x, y] = axis === 0 ? [a, i] : [i, a];
      out.rgba.set(value, (y * out.width + x) * 4);
    }
  });

  return out;
}

export function toRgba({ width, height, colors, opaque }) {
  const rgba = new Uint8Array(width * height * 4);

  opaque.forEach((on, i) => {
    if (on) {
      rgba.set(colors.subarray(i * 3, i * 3 + 3), i * 4);
      rgba[i * 4 + 3] = 255;
    }
  });

  return rgba;
}

function fromRgba({ width, height, rgba }) {
  const colors = new Uint8Array(width * height * 3);
  const opaque = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    colors.set(rgba.subarray(i * 4, i * 4 + 3), i * 3);
    opaque[i] = rgba[i * 4 + 3] > 0 ? 1 : 0;
  }

  return { width, height, colors, opaque };
}

// Scale the sprite to the reference's height (or `height`) when it was drawn with different-sized
// pixels, and make its pixels square. Within 5% it is left alone: resampling costs crispness, and
// a view can be a row taller than another (side-on hair).
export function matchHeight(sprite, ref, height = null) {
  const own = bbox(sprite.opaque, sprite.width);
  const refBox = bbox(ref.opaque, ref.width);
  const target = height || refBox.bottom - refBox.top;
  let fy = target / (own.bottom - own.top);

  if (!height && Math.abs(fy - 1) <= 0.05) {
    fy = 1.0;
  }

  const [sx, sy] = sprite.cell;
  const fx = (fy * sx) / sy;

  if (Math.abs(fx - 1) <= 0.01 && fy === 1.0) {
    return { ...sprite, scaled: null };
  }

  const rows = toRgba(sprite).subarray(own.top * sprite.width * 4, own.bottom * sprite.width * 4);
  const cropped = { width: sprite.width, height: own.bottom - own.top, rgba: rows };
  const scaled = scaleAxis(scaleAxis(cropped, fy, 0), fx, 1);

  return { ...sprite, ...fromRgba(scaled), scaled: { fx, fy, drawnHeight: own.bottom - own.top } };
}
