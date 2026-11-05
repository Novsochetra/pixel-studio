import { CLEAR, fromHex, getPixel, pack, setPixel, unpack } from '../model/sprite.js';

// Colours from text: a list of hex codes (Lospec .hex, a pasted list) or a GIMP .gpl palette.
export function parsePaletteText(text) {
  const colors = [];
  const gpl = /^GIMP Palette/i.test(text.trim());

  for (const line of text.split(/\r?\n/)) {
    const gplMatch = gpl && line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);

    if (gplMatch) {
      colors.push(pack(Number(gplMatch[1]), Number(gplMatch[2]), Number(gplMatch[3])));
      continue;
    }

    for (const hex of line.match(/#?\b[0-9a-f]{6}\b/gi) ?? []) {
      colors.push(fromHex(hex));
    }
  }

  return [...new Set(colors.filter((color) => color !== null))];
}

// the distinct colours of a picture (a palette strip or swatch image), at most `limit`
export function paletteFromPixels(sprite, limit = 256) {
  const seen = new Set();

  for (let y = 0; y < sprite.height && seen.size < limit; y++) {
    for (let x = 0; x < sprite.width && seen.size < limit; x++) {
      const color = getPixel(sprite, x, y);

      if (color !== CLEAR) {
        seen.add(color | 255);
      }
    }
  }

  return [...seen].map((color) => color >>> 0);
}

function toLab(color) {
  const linear = unpack(color)
    .slice(0, 3)
    .map((v) => {
      const c = v / 255;

      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  const [r, g, b] = linear;
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));

  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}

// how different two colours look (CIE76 distance in Lab)
export function colorDistance(a, b) {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);

  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function nearestColor(color, palette) {
  return palette.reduce((best, candidate) => (colorDistance(color, candidate) < colorDistance(color, best) ? candidate : best));
}

// a suggested mapping: each source colour to the target colour that looks closest
export function suggestMapping(sources, targets) {
  return Object.fromEntries(sources.map((source) => [source, nearestColor(source, targets)]));
}

// a new sprite with every mapped colour swapped; unmapped colours stay
export function applyMapping(sprite, mapping) {
  const out = { width: sprite.width, height: sprite.height, pixels: new Uint8ClampedArray(sprite.pixels) };

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const color = getPixel(sprite, x, y);
      const target = mapping[color];

      if (color !== CLEAR && target !== undefined && target !== null) {
        setPixel(out, x, y, target);
      }
    }
  }

  return out;
}
