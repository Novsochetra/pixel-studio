import { keepSetting, readSetting } from '../remembered.js';

const GRID_ALL = 'pixel-clean-grid-all';

export const readGridAll = () => Boolean(readSetting(GRID_ALL, false));

export function setGridAll(app, all) {
  keepSetting(GRID_ALL, all);
  app.store.set({ gridAll: all });
}
