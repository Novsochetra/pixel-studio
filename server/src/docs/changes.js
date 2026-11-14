// kept in memory: Railway runs one server, so every page of an account listens to the same one
export function createChanges() {
  const listeners = new Map();

  const of = (userId) => listeners.get(userId) ?? new Set();

  return {
    listen(userId, listener) {
      listeners.set(userId, of(userId).add(listener));

      return () => {
        of(userId).delete(listener);

        if (!of(userId).size) {
          listeners.delete(userId);
        }
      };
    },

    tell(userId, change) {
      of(userId).forEach((listener) => listener(change));
    },

    // each page let go, as the server stops: an open stream would hold it up for ever
    endAll() {
      listeners.forEach((each) => each.forEach((listener) => listener(null)));
      listeners.clear();
    },
  };
}
