import { keepSetting, readSetting } from '../remembered.js';

const GRID_HEIGHT = 'pixel-clean-grid-height';

// enough for the bar and one whole row of frames on one side, and to still draw on the other
const LEAST_FOR_FRAMES = 160;
const LEAST_FOR_CANVAS = 120;

// canvasNeeds: the canvas at its own size, the least zoom there is. A canvas taller than half
// the room is scrolled anyway, and does not keep the frames small.
export function fittedGridHeight(wanted, roomHeight, canvasNeeds = 0) {
  const forCanvas = Math.max(LEAST_FOR_CANVAS, Math.min(canvasNeeds, roomHeight / 2));
  const most = Math.max(LEAST_FOR_FRAMES, roomHeight - forCanvas);

  return Math.round(Math.min(most, Math.max(LEAST_FOR_FRAMES, wanted)));
}

// null means no height was chosen: the frames take what they need
export function readGridHeight() {
  const saved = readSetting(GRID_HEIGHT, null);

  return Number.isFinite(saved) ? saved : null;
}

export const keepGridHeight = (height) => keepSetting(GRID_HEIGHT, height);
