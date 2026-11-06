import { node, toast } from '../dom.js';
import { characterColors, characterCounts } from '../character-colours.js';
import { newId } from '../../model/project.js';
import { toHex } from '../../model/sprite.js';
import { reducePalette } from '../../palette/reduce.js';

function targetPicker(palette, current, onPick) {
  return node(
    'div.target-picker',
    { role: 'group' },
    node(
      'button.btn.quiet.keep',
      {
        'aria-pressed': String(current === undefined),
        onclick: () => onPick(undefined),
        title: 'Keep this colour as it is',
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
  const counts = new Map(characterCounts(state).map((entry) => [entry.color, entry.count]));

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

// a palette of the art's own colours, cut down to `size`, added to the project
export function makeReducedPalette(app, size) {
  const { state } = app.store;

  if (!characterColors(state).length) {
    toast('The art has no colours yet. Clean or draw a view first.');

    return null;
  }

  const palette = {
    id: newId('p'),
    name: `Character, ${size} colours`,
    colors: reducePalette(characterCounts(state), size),
  };
  state.project.palettes.push(palette);
  app.saver.markStructure();

  return palette;
}
