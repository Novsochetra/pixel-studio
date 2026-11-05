// A sprite is { width, height, pixels } with pixels as RGBA bytes, like ImageData.

export const CLEAR = 0;

export function createSprite(width, height) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

export function cloneSprite(sprite) {
  return { width: sprite.width, height: sprite.height, pixels: new Uint8ClampedArray(sprite.pixels) };
}

// one colour as a single number, 0xRRGGBBAA; every transparent pixel is CLEAR
export function pack(r, g, b, a = 255) {
  return a === 0 ? CLEAR : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

export function unpack(color) {
  return [color >>> 24, (color >>> 16) & 255, (color >>> 8) & 255, color & 255];
}

export function getPixel(sprite, x, y) {
  if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) {
    return CLEAR;
  }

  const i = (y * sprite.width + x) * 4;
  const p = sprite.pixels;

  return pack(p[i], p[i + 1], p[i + 2], p[i + 3]);
}

export function setPixel(sprite, x, y, color) {
  if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) {
    return false;
  }

  const i = (y * sprite.width + x) * 4;
  const [r, g, b, a] = color === CLEAR ? [0, 0, 0, 0] : unpack(color);
  const p = sprite.pixels;
  const changed = p[i] !== r || p[i + 1] !== g || p[i + 2] !== b || p[i + 3] !== a;
  p.set([r, g, b, a], i);

  return changed;
}

export function toHex(color) {
  const [r, g, b] = unpack(color);

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function fromHex(hex) {
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }

  return pack(parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16));
}

// colours in use, most used first: [{ color, count }]
export function colorCounts(sprite) {
  const counts = new Map();

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      const color = getPixel(sprite, x, y);

      if (color !== CLEAR) {
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count);
}

// { left, top, right, bottom } of the opaque pixels (right and bottom exclusive), or null
export function bounds(sprite) {
  let box = null;

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      if (getPixel(sprite, x, y) !== CLEAR) {
        box ??= { left: x, top: y, right: x + 1, bottom: y + 1 };
        box.left = Math.min(box.left, x);
        box.right = Math.max(box.right, x + 1);
        box.bottom = y + 1;
      }
    }
  }

  return box;
}

export function mapPixels(sprite, transform) {
  const out = createSprite(sprite.width, sprite.height);

  for (let y = 0; y < sprite.height; y++) {
    for (let x = 0; x < sprite.width; x++) {
      setPixel(out, x, y, transform(getPixel(sprite, x, y), x, y));
    }
  }

  return out;
}

export function flipHorizontal(sprite) {
  return mapPixels(sprite, (_, x, y) => getPixel(sprite, sprite.width - 1 - x, y));
}

export function samePixels(a, b) {
  return a.width === b.width && a.height === b.height && a.pixels.every((value, i) => value === b.pixels[i]);
}
