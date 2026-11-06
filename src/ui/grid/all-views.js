import { keepSetting, readSetting } from '../remembered.js';

const GRID_ALL = 'pixel-clean-grid-all';

// every view shows at first, so a new character's Side and Back are in sight from the start
export const readGridAll = () => Boolean(readSetting(GRID_ALL, true));

export function setGridAll(app, all) {
  keepSetting(GRID_ALL, all);
  app.store.set({ gridAll: all });
}

const GRID_OPEN = 'pixel-clean-grid-open';

export const readGridOpen = () => Boolean(readSetting(GRID_OPEN, true));

export function setGridOpen(app, open) {
  keepSetting(GRID_OPEN, open);
  app.store.set({ gridOpen: open });
}
