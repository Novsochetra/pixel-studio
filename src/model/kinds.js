import { directionLabel } from './project.js';

// What a project makes. The kind decides how many views there are, where the art stands on the
// canvas, how it is exported, and the names offered for new animations.
export const KINDS = {
  character: {
    label: 'Character',
    about: 'A hero or an enemy, seen from several sides and animated',
    itemName: 'animation',
    place: 'feet',
    ground: 0.8,
    size: 64,
    scale: 6,
    names: ['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'Hurt'],
    // it has a head, hands and feet to pin, and parts to cut it into and pose
    body: true,
  },
  object: {
    label: 'Object',
    about: 'A prop that stands in the world: a chest, a tree, a door',
    itemName: 'animation',
    view: 'Object',
    place: 'feet',
    ground: 0.9,
    size: 32,
    scale: 10,
    names: ['Idle', 'Open', 'Break'],
  },
  tile: {
    label: 'Tiles',
    about: 'Square tiles that join without seams: ground, walls, water',
    itemName: 'tile',
    view: 'Tile',
    place: 'fill',
    size: 16,
    scale: 16,
    names: ['Ground', 'Wall', 'Water'],
  },
  effect: {
    label: 'Effect',
    about: 'A spark, a hit or a spell, animated around its centre',
    itemName: 'animation',
    view: 'Effect',
    place: 'centre',
    size: 48,
    scale: 8,
    names: ['Burst', 'Loop', 'Fade'],
  },
  icon: {
    label: 'Icon',
    about: 'Items, buttons and portraits for menus and the screen',
    itemName: 'icon',
    view: 'Icon',
    place: 'centre',
    size: 32,
    scale: 10,
    names: ['Coin', 'Heart', 'Key', 'Potion'],
  },
};

// The parts a character is cut into, bottom one first, each following the part it hangs from.
// L and R are as the picture shows them.
export const BODY_PARTS = [
  { id: 'thigh-l', name: 'Thigh L', parent: 'hips' },
  { id: 'shin-l', name: 'Shin L', parent: 'thigh-l' },
  { id: 'foot-l', name: 'Foot L', parent: 'shin-l' },
  { id: 'thigh-r', name: 'Thigh R', parent: 'hips' },
  { id: 'shin-r', name: 'Shin R', parent: 'thigh-r' },
  { id: 'foot-r', name: 'Foot R', parent: 'shin-r' },
  { id: 'hips', name: 'Hips', parent: null },
  { id: 'torso', name: 'Torso', parent: 'hips' },
  { id: 'head', name: 'Head', parent: 'torso' },
  { id: 'upper-arm-l', name: 'Upper arm L', parent: 'torso' },
  { id: 'lower-arm-l', name: 'Lower arm L', parent: 'upper-arm-l' },
  { id: 'upper-arm-r', name: 'Upper arm R', parent: 'torso' },
  { id: 'lower-arm-r', name: 'Lower arm R', parent: 'upper-arm-r' },
];

// "Icon 2", "Tile 3": what a piece of art is called until it is given a name of its own
export const numberedName = (item, number) => `${item[0].toUpperCase()}${item.slice(1)} ${number}`;

export function kindOf(project) {
  return KINDS[project.kind] ?? KINDS.character;
}

// a kind seen from one side names its only view after itself ("Tile"), not after a direction
// pins and body parts are a character's: a chest, a tile or an icon has no head or hands
export const hasBody = (project) => Boolean(kindOf(project).body);

export function isSingleView(project) {
  return Boolean(kindOf(project).view);
}

// where a new picture stands when there is nothing to match it to
export function placementOf(project) {
  const kind = kindOf(project);

  return { place: kind.place, ground: kind.ground ?? null };
}

// a view's name: its direction for a character ("Side"), the kind's own name for the rest ("Tile")
export function viewName(project, direction) {
  return kindOf(project).view ?? directionLabel(direction);
}
