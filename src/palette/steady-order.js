// The art's colours in the order they were first shown: sorted by how much each is used, they
// changed places under the finger at every pose and stroke. `seen` is every colour shown before,
// in its place; a colour gone and come back takes its old place again.
export function steadyOrder(seen, colours) {
  const now = new Set(colours);
  const known = new Set(seen);
  const added = colours.filter((colour) => !known.has(colour));

  return {
    shown: [...seen.filter((colour) => now.has(colour)), ...added],
    seen: [...seen, ...added],
  };
}
