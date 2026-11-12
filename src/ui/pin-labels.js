const LINE_PX = 13;
const GAP_PX = 3;

const overlaps = (one, other) =>
  one.x < other.x + other.width + GAP_PX &&
  other.x < one.x + one.width + GAP_PX &&
  Math.abs(one.y - other.y) < LINE_PX;

// Where each pin's name is written: beside its dot, and a line lower for each name already
// written there. Two pins close together (the hands of a figure seen from the side) had their
// names one on the other, and neither could be read.
export function labelPlaces(dots, widthOf) {
  const placed = [];
  const downThenAcross = [...dots].sort((one, other) => one.y - other.y || one.x - other.x);

  for (const dot of downThenAcross) {
    const label = {
      name: dot.name,
      x: dot.x + dot.radius + GAP_PX,
      y: dot.y + GAP_PX,
      width: widthOf(dot.name),
    };

    while (placed.some((other) => overlaps(label, other))) {
      label.y += LINE_PX;
    }

    placed.push(label);
  }

  return placed;
}
