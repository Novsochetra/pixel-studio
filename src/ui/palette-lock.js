import { node, toast } from './dom.js';
import { characterColors } from './character-colours.js';
import { lockedColor } from '../palette/palette.js';
import { toHex } from '../model/sprite.js';
import { fieldRow, listGroup, switchRow } from './list-group.js';

// What "Paint only over" can be set to: any pixel, or one of the art's colours. The colour it is
// set to stays in the list when the art no longer has it, and says so: dropped to "Any pixel"
// without a word, the next strokes painted everywhere, and undo did not bring the setting back.
export function paintOverChoices(colors, paintOver) {
  const gone = paintOver !== null && !colors.includes(paintOver);

  return [
    { value: '', label: 'Any pixel' },
    ...colors.map((color) => ({ value: String(color), label: toHex(color) })),
    ...(gone
      ? [{ value: String(paintOver), label: `${toHex(paintOver)} · none in the art now` }]
      : []),
  ];
}

function paintOverField(app, colors) {
  const { state } = app.store;
  const options = paintOverChoices(colors, state.paintOver).map(({ value, label }) =>
    node('option', { value, selected: String(state.paintOver ?? '') === value }, label),
  );

  return fieldRow(
    'Paint over',
    node(
      'select.list-select',
      {
        id: 'paint-over',
        'aria-label': 'Paint only over',
        onchange: (event) =>
          app.store.set({ paintOver: event.target.value ? Number(event.target.value) : null }),
      },
      options,
    ),
    {
      title: 'Paint only over pixels of one colour',
      swatch: state.paintOver === null ? null : toHex(state.paintOver),
    },
  );
}

const allowedBy = (state, colors) => [
  ...colors,
  ...(state.project.palettes ?? []).flatMap((palette) => palette.colors),
];

// as a stroke starts: the art or its palettes may have changed since the lock was switched on
export function keepToLock(app) {
  const { state } = app.store;

  if (!state.paletteLock) {
    return;
  }

  const color = lockedColor(state.color, allowedBy(state, characterColors(state)));

  if (color !== state.color) {
    app.store.set({ color });
    toast(
      `Palette lock: ${toHex(state.color)} is in neither the art nor its palettes now: ${toHex(color)} is in hand`,
    );
  }
}

// Palette lock, and what a stroke paints over
export function lockGroup(app, colors) {
  const { state } = app.store;
  const allowed = allowedBy(state, colors);
  const lock = (on) =>
    app.store.set({
      paletteLock: on,
      // art with no colours yet has none to lock to: the colour in hand stays
      color: on && colors.length && !allowed.includes(state.color) ? colors[0] : state.color,
    });

  return listGroup(
    {},
    switchRow(
      'Palette lock',
      {
        id: 'palette-lock',
        checked: state.paletteLock,
        hint: "Draw only with the art's colours and its palettes",
      },
      lock,
    ),
    paintOverField(app, colors),
  );
}
