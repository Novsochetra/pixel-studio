import { CLEAR, getPixel, setPixel } from '../sprite.js';
import { applyTo, invert, isQuarterTurn } from './affine.js';
import { SMOOTH_SCALE, scale8 } from './scale2x.js';

// Where a part lands: its art ({ x, y, sprite }) carried by `matrix`, a map of the canvas. Each
// canvas pixel looks back through the map to the art it shows. A move or a quarter turn shows
// whole art pixels; any other turn samples the RotSprite picture, so lines stay clean.

function landingBox(art, matrix, { width, height }) {
  const right = art.x + art.sprite.width;
  const bottom = art.y + art.sprite.height;
  const points = [
    [art.x, art.y],
    [right, art.y],
    [art.x, bottom],
    [right, bottom],
  ].map((point) => applyTo(matrix, point));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return {
    left: Math.max(0, Math.floor(Math.min(...xs))),
    top: Math.max(0, Math.floor(Math.min(...ys))),
    right: Math.min(width, Math.ceil(Math.max(...xs))),
    bottom: Math.min(height, Math.ceil(Math.max(...ys))),
  };
}

// what the part shows at canvas pixel (x, y): CLEAR where it does not reach
export function sampler(art, matrix) {
  const back = invert(matrix);
  const exact = isQuarterTurn(matrix);
  const source = exact ? art.sprite : scale8(art.sprite);
  const scale = exact ? 1 : SMOOTH_SCALE;

  return (x, y) => {
    const [artX, artY] = applyTo(back, [x + 0.5, y + 0.5]);

    return getPixel(source, Math.floor((artX - art.x) * scale), Math.floor((artY - art.y) * scale));
  };
}

function samples(art, matrix, box) {
  const sample = sampler(art, matrix);
  const found = new Map();

  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      const colour = sample(x, y);

      if (colour !== CLEAR) {
        found.set(y * TOO_WIDE + x, colour);
      }
    }
  }

  return found;
}

const TOO_WIDE = 1 << 16;
const AROUND = [-1, 0, 1]
  .flatMap((dy) => [-1, 0, 1].map((dx) => dy * TOO_WIDE + dx))
  .filter((step) => step !== 0);
const CRUMB = 2;

function clump(found, start, seen) {
  const members = [start];

  seen.add(start);

  for (let i = 0; i < members.length; i++) {
    for (const next of AROUND.map((step) => members[i] + step)) {
      if (found.has(next) && !seen.has(next)) {
        seen.add(next);
        members.push(next);
      }
    }
  }

  return members;
}

// a turn can leave a pixel or two standing apart from the part: crumbs, dropped
function withoutCrumbs(found) {
  const seen = new Set();

  for (const at of [...found.keys()]) {
    if (!seen.has(at)) {
      const members = clump(found, at, seen);

      if (members.length <= CRUMB && members.length < found.size) {
        members.forEach((member) => found.delete(member));
      }
    }
  }

  return found;
}

export function drawPiece(target, art, matrix) {
  const found = samples(art, matrix, landingBox(art, matrix, target));
  const kept = isQuarterTurn(matrix) ? found : withoutCrumbs(found);

  for (const [at, colour] of kept) {
    setPixel(target, at % TOO_WIDE, Math.floor(at / TOO_WIDE), colour);
  }
}
