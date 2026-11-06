// Where a part turns by default: the middle of the edge it shares with the part it follows (a
// shoulder, a knee), on the part itself. A part that follows none, or touches nothing it follows,
// turns about its own middle.

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function touches(owners, { width, height }, [x, y], other) {
  return SIDES.some(([dx, dy]) => {
    const [nx, ny] = [x + dx, y + dy];

    return nx >= 0 && ny >= 0 && nx < width && ny < height && owners[ny * width + nx] === other;
  });
}

function nearestToMiddle(points) {
  const middleX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const middleY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const distance = ([x, y]) => (x - middleX) ** 2 + (y - middleY) ** 2;
  const [x, y] = points.reduce((best, point) => (distance(point) < distance(best) ? point : best));

  return { x, y };
}

// size: { width, height } of the canvas; index and parentIndex are places in the parts list
export function defaultPivot(owners, size, { index, parentIndex = -1 }) {
  const own = [];
  const joint = [];

  owners.forEach((owner, i) => {
    if (owner === index) {
      const point = [i % size.width, Math.floor(i / size.width)];

      own.push(point);

      if (parentIndex >= 0 && touches(owners, size, point, parentIndex)) {
        joint.push(point);
      }
    }
  });

  if (!own.length) {
    return null;
  }

  return nearestToMiddle(joint.length ? joint : own);
}
