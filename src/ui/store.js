// The editor's state, and who to tell when part of it changes.
export function createStore(initial) {
  const state = { ...initial };
  const listeners = new Set();

  return {
    state,
    set(patch) {
      Object.assign(state, patch);
      listeners.forEach((listener) => listener(state, patch));
    },
    // something inside the project changed in place (pixels, guides, palettes)
    touch(what = 'pixels') {
      listeners.forEach((listener) => listener(state, { [what]: true }));
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
