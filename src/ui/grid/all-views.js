// whether the frame grid shows every view or only the one being edited, remembered per browser
const GRID_ALL = 'pixel-clean-grid-all';

export function readGridAll() {
  try {
    return localStorage.getItem(GRID_ALL) === '1';
  } catch {
    return false;
  }
}

export function setGridAll(app, all) {
  try {
    localStorage.setItem(GRID_ALL, all ? '1' : '0');
  } catch {
    // nowhere to remember it: it holds for this visit
  }

  app.store.set({ gridAll: all });
}
