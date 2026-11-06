import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { allArtLayers, commit, directionSprite, directionsInUse } from './actions.js';
import { frameAt, newId } from '../model/project.js';
import { colorCounts, toHex } from '../model/sprite.js';
import { applyMapping, suggestMapping } from '../palette/palette.js';
import { reducePalette } from '../palette/reduce.js';
import { characterColors } from './character-colours.js';
import { paletteForm } from './palette-form.js';
import { boardPreview } from './board-canvas.js';

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

function layersFor(state, scope) {
  return scope === 'view'
    ? frameAt(state.project, state.at).layers.filter((layer) => layer.kind !== 'reference')
    : allArtLayers(state);
}

function setPreview(app, mapping, on) {
  app.store.set({ swapPreview: on ? mapping : null });
}

// every view with the swap applied, inside the sheet, since the sheet covers the canvas
function previewFigure(app, mapping) {
  const canvas = boardPreview(app.store.state, 420, { overlay: null, mapping });

  return node(
    'figure',
    { style: { margin: '0', display: 'grid', gap: '6px' } },
    canvas,
    node('figcaption.hint', {}, 'With the swap applied'),
  );
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

function mappingRows(state, palette, mapping, onChange) {
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

function makeReducedPalette(app, size) {
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

export function openSwapSheet(app) {
  const { state } = app.store;
  const sheet = openSheet('Swap colours', () => app.store.set({ swapPreview: null }));
  const slot = node('div', { style: { display: 'grid', gap: '12px' } });
  let paletteId = state.project.palettes.at(-1)?.id ?? null;
  let previewOn = true;

  const draw = () => {
    const palette = state.project.palettes.find((candidate) => candidate.id === paletteId);
    const choose = node(
      'select.input',
      {
        id: 'swap-palette',
        'aria-label': 'Target palette',
        onchange: (event) => {
          paletteId = event.target.value;
          draw();
        },
      },
      state.project.palettes.map((candidate) =>
        node(
          'option',
          { value: candidate.id, selected: candidate.id === paletteId },
          `${candidate.name} (${candidate.colors.length})`,
        ),
      ),
    );
    const addForm = paletteForm((added) => {
      state.project.palettes.push(added);
      paletteId = added.id;
      app.saver.markStructure();
      draw();
    });
    const reduce8 = node(
      'button.btn',
      {
        onclick: () => {
          paletteId = makeReducedPalette(app, 8)?.id ?? paletteId;
          draw();
        },
      },
      'Make an 8-colour palette from the character',
    );

    if (!palette) {
      replace(
        slot,
        node(
          'p.hint',
          {},
          "Add the palette you want to use: paste its hex codes or open a palette file. Or start from 8 of the character's own colours.",
        ),
        addForm,
        reduce8,
      );
      app.store.set({ swapPreview: null });

      return;
    }

    state.project.mappings[paletteId] ??= suggestMapping(characterColors(state), palette.colors);
    const mapping = state.project.mappings[paletteId];
    const onChange = (color, target) => {
      if (target === undefined) {
        delete mapping[color];
      } else {
        mapping[color] = target;
      }

      app.saver.markStructure();
      draw();
    };
    const suggest = () => {
      state.project.mappings[paletteId] = suggestMapping(characterColors(state), palette.colors);
      app.saver.markStructure();
      draw();
    };
    const previewToggle = node(
      'label.toggle-row',
      { for: 'swap-preview' },
      node('span', {}, 'Also preview on the canvas behind'),
      node('input.switch', {
        type: 'checkbox',
        role: 'switch',
        id: 'swap-preview',
        checked: previewOn,
        onchange: (event) => {
          previewOn = event.target.checked;
          setPreview(app, mapping, previewOn);
        },
      }),
    );
    const apply = (scope) => {
      const layers = layersFor(state, scope);
      commit(app, 'Swap colours', layers, () =>
        layers.forEach((layer) => {
          layer.sprite = applyMapping(layer.sprite, mapping);
        }),
      );
      toast(
        scope === 'view'
          ? 'Colours swapped in this frame'
          : 'Colours swapped across the whole character',
      );
      sheet.close();
    };

    replace(
      slot,
      node(
        'div.compare',
        {},
        node('label.field', {}, node('span', {}, 'Change to this palette'), choose),
        node(
          'div.field',
          {},
          node('span', {}, 'Each colour goes to the one you pick; Keep leaves it'),
          node(
            'div.group',
            {},
            node('button.btn', { onclick: suggest }, 'Suggest nearest'),
            reduce8,
          ),
        ),
      ),
      node(
        'div.compare',
        {},
        node('div.map-table', {}, mappingRows(state, palette, mapping, onChange)),
        previewFigure(app, mapping),
      ),
      previewToggle,
      node('details', {}, node('summary', {}, 'Add another palette'), addForm),
      node(
        'div.sheet-actions',
        {},
        node('button.btn', { onclick: sheet.close }, 'Cancel'),
        node('button.btn', { onclick: () => apply('view') }, 'Apply to this frame'),
        node('button.btn.primary', { onclick: () => apply('all') }, 'Apply to the whole character'),
      ),
    );
    setPreview(app, mapping, previewOn);
  };

  sheet.body.append(slot);
  draw();
}
