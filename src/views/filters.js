import { CLEAR, mapPixels, pack, unpack } from '../model/sprite.js';

const SILHOUETTE = pack(24, 24, 28);

// how the art is shown: as it is, as one flat shape (does the pose read?), or as light and dark
// only (is there enough contrast between the shades?)
export const VIEW_FILTERS = {
  colour: (sprite) => sprite,
  silhouette: (sprite) => mapPixels(sprite, (color) => (color === CLEAR ? CLEAR : SILHOUETTE)),
  grey: (sprite) =>
    mapPixels(sprite, (color) => {
      if (color === CLEAR) {
        return CLEAR;
      }

      const [r, g, b] = unpack(color);
      const value = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

      return pack(value, value, value);
    }),
};
