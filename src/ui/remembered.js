// A setting kept in this browser only. Private windows and blocked storage keep nothing: the
// setting then holds for this visit, and the next starts from the fallback.
export function readSetting(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    return saved === null ? fallback : JSON.parse(saved);
  } catch {
    return fallback;
  }
}

export function keepSetting(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // nowhere to keep it, as above
  }
}
