import { keepSetting, readSetting } from '../remembered.js';

const GRID_ALL = 'pixel-clean-grid-all';

// every view shows at first, so a new character's Side and Back are in sight from the start
export const readGridAll = () => Boolean(readSetting(GRID_ALL, true));

export function setGridAll(app, all) {
  keepSetting(GRID_ALL, all);
  app.store.set({ gridAll: all });
}
