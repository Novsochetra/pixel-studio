import { buildSheet } from './sheet.js';

export const GAME_FOLDER = 'apps/web/games/naga-eleven';

// every direction the game draws, in its order (src/render/actors/directions.js)
const GAME_DIRECTIONS = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

function jsValue(value, indent = '  ') {
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z]+)":/g, '$1:')
    .replace(/"/g, "'")
    .replace(/\n/g, `\n${indent}`);
}

// the SPRITES manifest for src/data/sprites.js, describing the sheets in this pack
export function manifestSource(results, settings, standHeight) {
  const animations = results
    .map(
      ({ name, manifest }) =>
        `    ${/^[a-z]+$/.test(name) ? name : `'${name}'`}: ${jsValue(manifest, '    ')},`,
    )
    .join('\n');

  return [
    '// Made by Pixel Clean Studio: the sheets in assets/sprites/ and how to read them.',
    '// Replace SPRITES in src/data/sprites.js with this to play with these sprites.',
    'export const SPRITES = {',
    `  frame: { width: ${settings.frameWidth}, height: ${settings.frameHeight} },`,
    `  anchor: { x: ${settings.anchorX}, y: ${settings.anchorY} },`,
    `  standHeight: ${standHeight},`,
    `  directions: ${jsValue(GAME_DIRECTIONS)},`,
    '  animations: {',
    animations,
    '  },',
    '};',
    '',
  ].join('\n');
}

// Every animation's sheet, laid out at the paths the repo uses, plus the manifest and a note.
export function gamePack(project, settings, standHeight) {
  const results = project.animations.map((animation) => buildSheet(project, animation, settings));
  const warnings = results.flatMap((result) =>
    result.warnings.map((warning) => `${result.name}: ${warning}`),
  );
  const readme = [
    'Pixel Clean Studio game pack',
    '',
    `Unzip at the root of the repo: the sheets land in ${GAME_FOLDER}/assets/sprites/.`,
    `Then put SPRITES from ${GAME_FOLDER}/src/data/sprites.pixel-clean.js into src/data/sprites.js.`,
    `Frames are ${settings.frameWidth}×${settings.frameHeight}, feet at (${settings.anchorX}, ${settings.anchorY}); the character stands ${standHeight} px tall.`,
    warnings.length ? `\nCheck these:\n${warnings.join('\n')}` : '',
  ].join('\n');

  return {
    sheets: results.map((result) => ({
      path: `${GAME_FOLDER}/assets/sprites/${result.name}.png`,
      sprite: result.sheet,
    })),
    texts: [
      {
        path: `${GAME_FOLDER}/src/data/sprites.pixel-clean.js`,
        text: manifestSource(results, settings, standHeight),
      },
      { path: 'PIXEL-CLEAN-README.txt', text: readme },
    ],
    warnings,
    results,
  };
}
