import { createSprite, getPixel, setPixel, CLEAR } from '../model/sprite.js';
import { compositeFrame } from '../model/composite.js';
import { hasArt, heldFrame } from '../model/frames.js';
import { drawnDirections, flippedSides } from '../model/directions.js';
import { isSingleView } from '../model/kinds.js';

// the drawn views in compass order, then the flipped ones when they are wanted
function sheetRows(project, animation, includeMirrored) {
  const rows = drawnDirections(animation).map((direction) => ({
    direction,
    source: direction,
    flip: false,
  }));

  if (includeMirrored) {
    rows.push(
      ...flippedSides(project, animation).map(([direction, source]) => ({
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

      const frameX = x - artAnchor.x + anchorX;
      const frameY = y - artAnchor.y + anchorY;
      // mirrored about the anchor, so the feet stay where the manifest says
      const placedX = flip ? 2 * anchorX - frameX : frameX;

      if (placedX < 0 || frameY < 0 || placedX >= frameWidth || frameY >= frameHeight) {
        clipped++;
      } else {
        setPixel(sheet, cell.x + placedX, cell.y + frameY, color);
      }
    }
  }

  return clipped;
}

function manifestRows(project, rows, includeMirrored, animation) {
  const entries = rows.map((row, index) => [row.direction, index]);

  if (!includeMirrored) {
    entries.push(
      ...flippedSides(project, animation).map(([direction, source]) => [
        direction,
        { mirrorOf: source },
      ]),
    );
  }

  return Object.fromEntries(entries);
}

// one row of the sheet: every frame of the row's view, the last one repeated if it has fewer
// a view or frame not drawn yet ships as blank cells, which a game shows as the sprite vanishing
function emptyWarning(row, viewFrames) {
  const empty = viewFrames.flatMap((frame, index) => (hasArt(frame) ? [] : [index + 1]));

  if (row.flip || !empty.length) {
    return [];
  }

  return empty.length === viewFrames.length
    ? [`${row.direction} is empty: it ships as a blank row.`]
    : [`${row.direction}: frame ${empty.join(', ')} ${empty.length > 1 ? 'are' : 'is'} empty.`];
}

function placeRow(sheet, row, place) {
  const { project, animation, settings, frames, rowIndex } = place;
  const { frameWidth, frameHeight } = settings;
  const viewFrames = animation.directions[row.source].frames;
  const warnings = emptyWarning(row, viewFrames);
  let clipped = 0;

  for (let frameIndex = 0; frameIndex < frames; frameIndex++) {
    const frame = heldFrame(viewFrames, frameIndex);
    const art = compositeFrame(frame, project.canvas.width, project.canvas.height);
    const cell = { x: frameIndex * frameWidth, y: rowIndex * frameHeight, flip: row.flip };

    clipped += placeFrame(sheet, art, cell, settings);
  }

  if (viewFrames.length < frames) {
    warnings.push(
      `${row.direction} has ${viewFrames.length} of ${frames} frames; its last frame repeats.`,
    );
  }

  if (clipped && !row.flip) {
    warnings.push(
      `${row.direction}: ${clipped} pixels fall outside the ${frameWidth}×${frameHeight} frame.`,
    );
  }

  return warnings;
}

const plainSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// The file name an animation's sheet gets; a name with no Latin letters or digits gets its place.
// Names that come out the same ("Run" and "Run!") get -2, -3 so no file overwrites another.
function slugOf(project, animation) {
  const at = project.animations.indexOf(animation);
  const plain = plainSlug(animation.name) || `animation-${at + 1}`;
  const before = project.animations
    .slice(0, at)
    .filter((other, i) => (plainSlug(other.name) || `animation-${i + 1}`) === plain).length;

  return before ? `${plain}-${before + 1}` : plain;
}

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

  return { sheet, rows, frames, warnings, manifest, name: slug, oneView: isSingleView(project) };
}
