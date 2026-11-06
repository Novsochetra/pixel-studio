import { directionLabel } from './project.js';

// What a project makes. The kind decides how many views there are, where the art stands on the
// canvas, how it is previewed and exported, and the names offered for new animations.
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
    preview: 'scene',
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
    preview: 'scene',
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
    preview: 'tiled',
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
    preview: 'centred',
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
    preview: 'centred',
  },
};

export function kindOf(project) {
  return KINDS[project.kind] ?? KINDS.character;
}

// a kind seen from one side names its only view after itself ("Tile"), not after a direction
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
