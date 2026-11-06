import { createSprite, getPixel, setPixel, CLEAR } from '../model/sprite.js';
import { compositeFrame } from '../model/composite.js';

import { ALL_DIRECTIONS, mirrorsOf } from '../model/directions.js';

// the mirrors this animation can use: a direction the set mirrors, from one it has drawn
function usableMirrors(project, animation) {
  return Object.entries(mirrorsOf(project)).filter(
    ([direction, source]) => animation.directions[source] && !animation.directions[direction],
  );
}

// rows in compass order (Naga Eleven's order), then the mirrored ones when they are wanted
function sheetRows(project, animation, includeMirrored) {
  const drawn = ALL_DIRECTIONS.filter((direction) => animation.directions[direction]);
  const rows = drawn.map((direction) => ({ direction, source: direction, flip: false }));

  if (includeMirrored) {
    rows.push(
      ...usableMirrors(project, animation).map(([direction, source]) => ({
        direction,
        source,
        flip: true,
      })),
    );
  }

  return rows;
}

// one frame into its cell ({ x, y, flip }): the art's anchor (feet centre) lands on the frame's
// anchor
function placeFrame(sheet, art, cell, settings) {
  const { flip } = cell;
  const { frameWidth, frameHeight, anchorX, anchorY, artAnchor } = settings;
  let clipped = 0;

  for (let y = 0; y < art.height; y++) {
    for (let x = 0; x < art.width; x++) {
      const color = getPixel(art, x, y);

      if (color === CLEAR) {
        continue;
      }

      const fx = x - artAnchor.x + anchorX;
      const fy = y - artAnchor.y + anchorY;
      // mirrored about the anchor, so the feet stay where the manifest says
      const cx = flip ? 2 * anchorX - fx : fx;

      if (cx < 0 || fy < 0 || cx >= frameWidth || fy >= frameHeight) {
        clipped++;
      } else {
        setPixel(sheet, cell.x + cx, cell.y + fy, color);
      }
    }
  }

  return clipped;
}

function manifestRows(project, rows, includeMirrored, animation) {
  const entries = rows.map((row, index) => [row.direction, index]);

  if (!includeMirrored) {
    entries.push(
      ...usableMirrors(project, animation).map(([direction, source]) => [
        direction,
        { mirrorOf: source },
      ]),
    );
  }

  return Object.fromEntries(entries);
}

// one row of the sheet: every frame of the row's view, the last one repeated if it has fewer
function placeRow(sheet, row, place) {
  const { project, animation, settings, frames, rowIndex } = place;
  const { frameWidth, frameHeight } = settings;
  const list = animation.directions[row.source].frames;
  const warnings = [];
  let clipped = 0;

  for (let frameIndex = 0; frameIndex < frames; frameIndex++) {
    const frame = list[Math.min(frameIndex, list.length - 1)];
    const art = compositeFrame(frame, project.canvas.width, project.canvas.height);
    const cell = { x: frameIndex * frameWidth, y: rowIndex * frameHeight, flip: row.flip };
    clipped += placeFrame(sheet, art, cell, settings);
  }

  if (list.length < frames) {
    warnings.push(
      `${row.direction} has ${list.length} of ${frames} frames; its last frame repeats.`,
    );
  }

  if (clipped && !row.flip) {
    warnings.push(
      `${row.direction}: ${clipped} pixels fall outside the ${frameWidth}×${frameHeight} frame.`,
    );
  }

  return warnings;
}

// the file name an animation's sheet gets; a name with no Latin letters or digits gets its place
function slugOf(project, animation) {
  const plain = animation.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return plain || `animation-${project.animations.indexOf(animation) + 1}`;
}

// The animation as one sheet: frames left to right, directions top to bottom, plus the entry
// for the game's SPRITES manifest and anything that did not fit.
export function buildSheet(project, animation, settings) {
  const rows = sheetRows(project, animation, settings.includeMirrored);
  const frames = Math.max(...rows.map((row) => animation.directions[row.source].frames.length));
  const sheet = createSprite(frames * settings.frameWidth, rows.length * settings.frameHeight);
  const warnings = rows.flatMap((row, rowIndex) =>
    placeRow(sheet, row, { project, animation, settings, frames, rowIndex }),
  );
  const slug = slugOf(project, animation);
  const manifest = {
    image: `assets/sprites/${slug}.png`,
    frames,
    fps: animation.fps,
    rows: manifestRows(project, rows, settings.includeMirrored, animation),
  };

  return { sheet, rows, frames, warnings, manifest, name: slug };
}
