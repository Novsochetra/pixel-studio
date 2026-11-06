import { createSprite } from './sprite.js';

// The frame as it ships: its visible art layers stacked bottom to top. Pixel art has no
// half-transparent pixels, so an opaque pixel above simply covers the one below. Reference layers
// (pictures to trace over) are never part of it.
// With `includeHidden`, hidden art layers count too: what the character is, not what is shown.
export function compositeFrame(frame, width, height, { includeHidden = false } = {}) {
  const out = createSprite(width, height);
  const art = frame.layers.filter(
    (layer) => layer.kind !== 'reference' && (layer.visible || includeHidden) && layer.sprite,
  );

  if (art.length === 1) {
    out.pixels.set(art[0].sprite.pixels);

    return out;
  }

  for (const layer of art) {
    const source = layer.sprite.pixels;

    for (let i = 0; i < source.length; i += 4) {
      if (source[i + 3]) {
        out.pixels[i] = source[i];
        out.pixels[i + 1] = source[i + 1];
        out.pixels[i + 2] = source[i + 2];
        out.pixels[i + 3] = 255;
      }
    }
  }

  return out;
}
