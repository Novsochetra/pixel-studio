import { node, toast } from '../dom.js';
import { directionSprite, directionsInUse } from '../actions.js';
import { characterColors } from '../character-colours.js';
import { newId } from '../../model/project.js';
import { colorCounts, toHex } from '../../model/sprite.js';
import { reducePalette } from '../../palette/reduce.js';

function characterEntries(state) {
  const totals = new Map();

  for (const direction of directionsInUse(state)) {
    const sprite = directionSprite(state, direction);

    for (const { color, count } of sprite ? colorCounts(sprite) : []) {
      totals.set(color, (totals.get(color) ?? 0) + count);
    }
  }

  return [...totals.entries()].map(([color, count]) => ({ color, count }));
}

function targetPicker(palette, current, onPick) {
  return node(
    'div.target-picker',
    { role: 'group' },
    node(
      'button.btn.quiet',
      {
        'aria-pressed': String(current === undefined),
        onclick: () => onPick(undefined),
        title: 'Keep this colour',
      },
      'Keep',
    ),
    palette.colors.map((color) =>
      node('button.swatch', {
        style: { background: toHex(color) },
        'aria-pressed': String(current === color),
        title: toHex(color),
        'aria-label': `Change to ${toHex(color)}`,
        onclick: () => onPick(color),
      }),
    ),
  );
}

// one row per character colour: the colour, how much of it there is, and what it becomes
export function mappingRows(state, palette, mapping, onChange) {
  const counts = new Map(characterEntries(state).map((entry) => [entry.color, entry.count]));

  return characterColors(state).map((color) =>
    node(
      'div.map-row',
      {},
      node('span.swatch', { style: { background: toHex(color) }, 'aria-hidden': 'true' }),
      node('span.mono', {}, toHex(color), node('span.hint', {}, ` · ${counts.get(color)} px`)),
      node('span', { 'aria-hidden': 'true' }, '→'),
      targetPicker(palette, mapping[color], (target) => onChange(color, target)),
    ),
  );
}

// a palette of the character's own colours, cut down to `size`, added to the project
export function makeReducedPalette(app, size) {
  const { state } = app.store;

  if (!characterColors(state).length) {
    toast('The character has no colours yet. Clean or draw a view first.');

    return null;
  }

  const palette = {
    id: newId('p'),
    name: `Character, ${size} colours`,
    colors: reducePalette(characterEntries(state), size),
  };
  state.project.palettes.push(palette);
  app.saver.markStructure();

  return palette;
}
