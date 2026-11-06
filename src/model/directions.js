// Directions are the eight compass names (south faces the camera); a direction set says which are
// drawn and which are left for the game to mirror.

export const ALL_DIRECTIONS = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

export const DIRECTION_SETS = {
  side: {
    label: 'Side view only (side-scroller)',
    drawn: ['east'],
    mirrors: { west: 'east' },
  },
  four: {
    label: 'Four directions, left mirrored',
    drawn: ['south', 'east', 'north'],
    mirrors: { west: 'east' },
  },
  'four-drawn': {
    label: 'Four directions, all drawn',
    drawn: ['south', 'west', 'east', 'north'],
    mirrors: {},
  },
  naga: {
    label: 'Five directions, west side mirrored (Naga Eleven)',
    drawn: ['south', 'south-east', 'east', 'north-east', 'north'],
    mirrors: { 'north-west': 'north-east', west: 'east', 'south-west': 'south-east' },
  },
  eight: {
    label: 'All eight directions drawn',
    drawn: ALL_DIRECTIONS,
    mirrors: {},
  },
  // objects, tiles, effects and icons are seen from one side only
  single: {
    label: 'One view',
    drawn: ['south'],
    mirrors: {},
    hidden: true,
  },
};

export function directionSetOf(project) {
  return DIRECTION_SETS[project.directionSet] ?? DIRECTION_SETS.four;
}

// the directions a project may draw, in compass order
export function drawableDirections(project) {
  return directionSetOf(project).drawn;
}

export function mirrorsOf(project) {
  return directionSetOf(project).mirrors;
}

// the views an animation draws, in compass order: the order of a sheet's rows
export function drawnDirections(animation) {
  return ALL_DIRECTIONS.filter((direction) => animation.directions[direction]);
}

// the views the project can draw that the animation does not have yet
export function missingDirections(project, animation) {
  return drawableDirections(project).filter((direction) => !animation.directions[direction]);
}

// the sides the game draws by flipping a view the animation has, as [side, view] pairs
export function flippedSides(project, animation) {
  return Object.entries(mirrorsOf(project)).filter(
    ([side, source]) => animation.directions[source] && !animation.directions[side],
  );
}
