// The editor's state, and who to tell when part of it changes.
export function createStore(initial) {
  const state = { ...initial };
  const listeners = new Set();
  let held = null;
  const tell = (patch) =>
    held ? Object.assign(held, patch) : listeners.forEach((listener) => listener(state, patch));

  return {
    state,
    set(patch) {
      Object.assign(state, patch);
      tell(patch);
    },
    // something inside the project changed in place (pixels, guides, palettes)
    touch(what = 'pixels') {
      tell({ [what]: true });
    },
    // Changes made together are told once, when they are all made: a cut set the place, then
    // the animations, then the tool, and the editor was drawn three times, a second on a slow
    // phone.
    together(change) {
      if (held) {
        return change();
      }

      held = {};

      try {
        return change();
      } finally {
        const patch = held;

        held = null;

        if (Object.keys(patch).length) {
          tell(patch);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
