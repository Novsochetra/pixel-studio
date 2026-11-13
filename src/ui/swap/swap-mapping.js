import { icon, node, toast } from '../dom.js';
import { everyColour, everyColourCount } from '../character-colours.js';
import { oneStop } from '../one-stop.js';
import { newId } from '../../model/project.js';
import { toHex } from '../../model/sprite.js';
import { reducePalette } from '../../palette/reduce.js';
import { addPaletteStep } from '../palette-step.js';

// the group says which colour its buttons are for: sixteen rows of "Keep" said nothing of it
function targetPicker(palette, { from, current }, onPick) {
  const group = node(
    'div.target-picker',
    { role: 'group', 'aria-label': `What ${toHex(from)} becomes` },
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

  return oneStop(group);
}

// one row per character colour: the colour, how much of it there is, and what it becomes
export function mappingRows(state, palette, mapping, onChange) {
  return everyColourCount(state).map(({ color, count }) =>
    node(
      'div.map-row',
      {},
      node('span.swatch', { style: { background: toHex(color) }, 'aria-hidden': 'true' }),
      node('span.mono', {}, toHex(color), node('span.hint', {}, ` · ${count} px`)),
      icon('arrow-right'),
      targetPicker(palette, { from: color, current: mapping[color] }, (target) =>
        onChange(color, target),
      ),
    ),
  );
}

// a palette of the art's own colours, cut down to `size`, added to the project
export function makeReducedPalette(app, size) {
  const { state } = app.store;

  if (!everyColour(state).length) {
    toast('The art has no colours yet. Clean or draw a view first.');

    return null;
  }

  const palette = {
    id: newId('p'),
    name: `Character, ${size} colours`,
    colors: reducePalette(everyColourCount(state), size),
  };
  addPaletteStep(app, palette);

  return palette;
}
