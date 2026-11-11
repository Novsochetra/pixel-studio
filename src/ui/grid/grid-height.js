import { keepSetting, readSetting } from '../remembered.js';

const GRID_HEIGHT = 'pixel-clean-grid-height';

// enough for the tabs and one row of frames on one side, and to still draw on the other
const LEAST_FOR_FRAMES = 120;
const LEAST_FOR_CANVAS = 120;

export function fittedGridHeight(wanted, roomHeight) {
  const most = Math.max(LEAST_FOR_FRAMES, roomHeight - LEAST_FOR_CANVAS);

  return Math.round(Math.min(most, Math.max(LEAST_FOR_FRAMES, wanted)));
}

// null means no height was chosen: the frames take what they need
export function readGridHeight() {
  const saved = readSetting(GRID_HEIGHT, null);

  return Number.isFinite(saved) ? saved : null;
}

export const keepGridHeight = (height) => keepSetting(GRID_HEIGHT, height);
