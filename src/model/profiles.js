// What a project is drawn for. Directions are the eight compass names Naga Eleven uses
// (south faces the camera); a direction set says which ones are drawn and which are left for the
// game to mirror.

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
};

export const PROFILES = {
  'naga-eleven': {
    label: 'Naga Eleven',
    directionSet: 'naga',
    startWith: ['south', 'east', 'north'],
    teamKits: true,
    preview: 'pitch',
    gamePack: true,
    parts: ['Shirt', 'Shorts', 'Socks', 'Trim'],
  },
  generic: {
    label: 'Any game',
    directionSet: 'four',
    startWith: null,
    teamKits: false,
    preview: 'plain',
    gamePack: false,
    parts: [],
  },
};

export function profileOf(project) {
  return PROFILES[project.profile] ?? PROFILES.generic;
}

export function directionSetOf(project) {
  return DIRECTION_SETS[project.directionSet] ?? DIRECTION_SETS[profileOf(project).directionSet];
}

// the directions a project may draw, in compass order
export function drawableDirections(project) {
  return directionSetOf(project).drawn;
}

export function mirrorsOf(project) {
  return directionSetOf(project).mirrors;
}
