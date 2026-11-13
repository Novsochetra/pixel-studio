// The names of the documents this browser holds and the server does not yet, kept across visits:
// a change made with no network is sent on the next visit that has one.
export function waitingKeys(storage, owner) {
  const name = `pixel-clean-waiting-${owner}`;
  const read = () => {
    try {
      return new Set(JSON.parse(storage?.getItem(name) ?? '[]'));
    } catch {
      return new Set();
    }
  };
  const keys = read();
  const keep = () => {
    try {
      storage?.setItem(name, JSON.stringify([...keys]));
    } catch {
      // a store that is full or refused keeps nothing; the change is still in this browser
    }
  };

  return {
    has: (key) => keys.has(key),
    add: (key) => keys.add(key) && keep(),
    delete: (key) => keys.delete(key) && keep(),
    keys: () => [...keys],
  };
}
