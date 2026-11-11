// A sprite is { width, height, pixels } with pixels as RGBA bytes, like ImageData.

export const CLEAR = 0;

export function createSprite(width, height) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

export function cloneSprite(sprite) {
  return {
    width: sprite.width,
    height: sprite.height,
    pixels: new Uint8ClampedArray(sprite.pixels),
  };
}

// one colour as a single number, 0xRRGGBBAA; every transparent pixel is CLEAR
export function pack(red, green, blue, alpha = 255) {
  return alpha === 0 ? CLEAR : ((red << 24) | (green << 16) | (blue << 8) | alpha) >>> 0;
}

export function unpack(color) {
  return [color >>> 24, (color >>> 16) & 255, (color >>> 8) & 255, color & 255];
}

export function getPixel(sprite, x, y) {
  if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) {
    return CLEAR;
  }

  const i = (y * sprite.width + x) * 4;
  const pixels = sprite.pixels;

  return pack(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
}

export function setPixel(sprite, x, y, color) {
  if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) {
    return false;
  }

  const i = (y * sprite.width + x) * 4;
  const [red, green, blue, alpha] = color === CLEAR ? [0, 0, 0, 0] : unpack(color);
  const pixels = sprite.pixels;
  const changed =
    pixels[i] !== red ||
    pixels[i + 1] !== green ||
    pixels[i + 2] !== blue ||
    pixels[i + 3] !== alpha;
  pixels.set([red, green, blue, alpha], i);

  return changed;
}

export function toHex(color) {
  const [red, green, blue] = unpack(color);

  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function fromHex(hex) {
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3 ? [...clean].map((colour) => colour + colour).join('') : clean;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }

  return pack(
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  );
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

  return [...counts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((first, second) => second.count - first.count);
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

// the box around all of `boxes`; boxes of empty sprites (null) are left out
export function unionBounds(boxes) {
  const found = boxes.filter(Boolean);

  if (!found.length) {
    return null;
  }

  return {
    left: Math.min(...found.map((box) => box.left)),
    top: Math.min(...found.map((box) => box.top)),
    right: Math.max(...found.map((box) => box.right)),
    bottom: Math.max(...found.map((box) => box.bottom)),
  };
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

export function cropped(sprite, box) {
  const out = createSprite(box.right - box.left, box.bottom - box.top);

  for (let y = 0; y < out.height; y++) {
    const from = ((box.top + y) * sprite.width + box.left) * 4;

    out.pixels.set(sprite.pixels.subarray(from, from + out.width * 4), y * out.width * 4);
  }

  return out;
}

export function samePixels(first, second) {
  return (
    first.width === second.width &&
    first.height === second.height &&
    first.pixels.every((value, i) => value === second.pixels[i])
  );
}
