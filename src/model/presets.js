import { DIRECTION_SETS } from './directions.js';
import { KINDS } from './kinds.js';

// A preset is data: what a new project starts with. Its game settings are copied into the
// project, so a project never depends on its preset again.
export const NAGA_ELEVEN = {
  id: 'naga-eleven',
  label: 'Naga Eleven',
  kind: 'character',
  directionSet: 'naga',
  startWith: ['south', 'east', 'north'],
  canvas: { width: 160, height: 160, scale: 5 },
  parts: ['Shirt', 'Shorts', 'Socks', 'Trim'],
  names: ['Idle', 'Run', 'Kick', 'Slide', 'Fall', 'Dive', 'Celebrate'],
  game: {
    name: 'Naga Eleven',
    teamKits: true,
    gamePack: true,
    background: 'pitch',
    // where the feet stand on the bundled match screenshot (404 of 432 px)
    ground: 404 / 432,
    // the game draws its footballer this tall (src/data/sprites.js)
    spriteHeight: 58,
    frame: {
      label: 'Naga Eleven today (64×62)',
      frameWidth: 64,
      frameHeight: 62,
      anchorX: 32,
      anchorY: 61,
    },
  },
};

export const BUILT_IN_PRESETS = [NAGA_ELEVEN];

// a blank start for a kind: its own canvas and directions, no game of its own
export function blankPreset(kindId) {
  const kind = KINDS[kindId] ?? KINDS.character;

  return {
    id: `blank-${kindId}`,
    label: kind.label,
    kind: kindId,
    directionSet: kindId === 'character' ? 'four' : 'single',
    canvas: { width: kind.size, height: kind.size, scale: kind.scale },
    parts: [],
    names: kind.names,
    game: {},
  };
}

// the game a project is made for; projects from before presets were all made for Naga Eleven
export function gameOf(project) {
  return project.game ?? {};
}

export function legacyGame(profile) {
  return profile === 'generic' ? {} : structuredClone(NAGA_ELEVEN.game);
}

// a kind this version does not know (from a newer file) is drawn as a character, as kindOf has it
export function validDirectionSet(id, kindId) {
  if (KINDS[kindId] && kindId !== 'character') {
    return 'single';
  }

  return DIRECTION_SETS[id] && id !== 'single' ? id : 'four';
}

// how the projects list describes a project: "Character for Naga Eleven", "Tiles"
export function describeProject(project) {
  const kind = KINDS[project.kind]?.label ?? 'Character';
  const game = gameOf(project).name;

  return game ? `${kind} for ${game}` : kind;
}

// list entries written before kinds named only a profile
export function describeEntry(entry) {
  if (entry.about) {
    return entry.about;
  }

  return entry.profile === 'generic' ? 'Character' : 'Character for Naga Eleven';
}

// "New character", "New tiles": what a project is called until it is named
export function defaultName(preset) {
  return `New ${(KINDS[preset.kind]?.label ?? 'Character').toLowerCase()}`;
}
