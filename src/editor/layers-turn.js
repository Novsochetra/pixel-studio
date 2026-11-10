import { turnAbout } from '../model/body/affine.js';
import { drawPiece } from '../model/body/place.js';
import { bounds, cloneSprite, cropped, samePixels, unionBounds } from '../model/sprite.js';
import { handleAround } from './selection-turn.js';

function artBox(layers) {
  const box = unionBounds(layers.map((layer) => bounds(layer.sprite)));

  return box && { ...box, right: box.right - 1, bottom: box.bottom - 1 };
}

function pieceOf(sprite) {
  const box = bounds(sprite);

  return box && { x: box.left, y: box.top, sprite: cropped(sprite, box) };
}

// Layers turn together, about the middle of all their art. Each turn is drawn from the first
// pixels: turned pixels turned again would wear away.
export function startLayersTurn(layers) {
  const box = artBox(layers);

  if (!box) {
    return null;
  }

  return {
    box,
    centre: { x: (box.left + box.right + 1) / 2, y: (box.top + box.bottom + 1) / 2 },
    angle: 0,
    pieces: new Map(layers.map((layer) => [layer.id, pieceOf(layer.sprite)])),
  };
}

export function applyLayersTurn(layers, turn, angle) {
  const matrix = turnAbout(turn.centre, angle);

  for (const layer of layers) {
    const piece = turn.pieces.get(layer.id);

    layer.sprite.pixels.fill(0);

    if (piece) {
      drawPiece(layer.sprite, piece, matrix);
    }
  }

  const shown = new Map(layers.map((layer) => [layer.id, cloneSprite(layer.sprite)]));

  return { ...turn, angle, shown };
}

// a turn goes on only over the pixels it left: an edit, an undo or another frame ends it
export function liveLayersTurn(turn, layers) {
  const sameLayers = turn?.shown?.size === layers.length;
  const unchanged = (layer) => {
    const shown = turn.shown.get(layer.id);

    return shown && samePixels(shown, layer.sprite);
  };

  return sameLayers && layers.every(unchanged) ? turn : null;
}

export function layersHandle(layers, turn, { canvas, gap }) {
  const live = liveLayersTurn(turn, layers);
  const box = live?.box ?? artBox(layers);

  return box ? handleAround(box, live?.angle ?? 0, { canvas, gap }) : null;
}
