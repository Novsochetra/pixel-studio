import { h, icon, replace } from './dom.js';
import { directionSprite } from './actions.js';
import { characterColors } from './character-colours.js';
import { CLEAR, bounds, fromHex, toHex } from '../model/sprite.js';
import { openSwapSheet } from './swap-sheet.js';
import { openOutfitsSheet } from './outfits-sheet.js';
import { profileOf } from '../model/profiles.js';

function swatch(color, pressed, onclick, title) {
  return h(`button.swatch${color === CLEAR ? '.clear' : ''}`, {
    style: color === CLEAR ? null : { background: toHex(color) },
    title,
    'aria-label': title,
    'aria-pressed': String(pressed),
    onclick,
  });
}

function currentColour(app, colors) {
  const { state } = app.store;
  const hex = h('input.input.mono', {
    value: toHex(state.color),
    'aria-label': 'Colour hex code',
    id: 'colour-hex',
    disabled: state.paletteLock,
    onchange: (event) => {
      const color = fromHex(event.target.value);

      if (color !== null) {
        app.store.set({ color });
      }
    },
  });
  const outside = !colors.includes(state.color);

  return h(
    'div.current-colour',
    {},
    h('div.swatch', { style: { background: toHex(state.color) }, 'aria-hidden': 'true' }),
    h('div.field', {}, hex, h('span', {}, outside ? 'Not one of the character colours yet' : 'Character colour')),
  );
}

function paintOverField(app, colors) {
  const { state } = app.store;
  const options = [h('option', { value: '' }, 'Any pixel'), ...colors.map((color) => h('option', { value: String(color), selected: state.paintOver === color }, toHex(color)))];

  return h(
    'label.field',
    {},
    h('span', {}, 'Paint only over'),
    h(
      'select.input',
      {
        id: 'paint-over',
        onchange: (event) => app.store.set({ paintOver: event.target.value ? Number(event.target.value) : null }),
      },
      options,
    ),
  );
}

function toggle(label, hint, checked, onchange, id) {
  return h(
    'label.toggle-row',
    { for: id },
    h('span', {}, h('div', {}, label), h('div.hint', {}, hint)),
    h('input.switch', { type: 'checkbox', id, role: 'switch', checked, onchange: (event) => onchange(event.target.checked) }),
  );
}

function mirrorField(app) {
  const { state } = app.store;
  const centre = () => {
    const sprite = directionSprite(state, state.at.direction);
    const box = sprite && bounds(sprite);

    if (box) {
      app.store.set({ symmetry: { ...state.symmetry, axisSum: box.left + box.right - 1 } });
    }
  };

  const caption = (axisSum) => `Mirror line at x ${((axisSum + 1) / 2).toFixed(1)}`;
  const label = h('span', {}, caption(state.symmetry.axisSum));

  // the slider updates the line in place, so re-rendering the panel does not end the drag
  const slide = (event) => {
    state.symmetry = { ...state.symmetry, axisSum: Number(event.target.value) };
    label.textContent = caption(state.symmetry.axisSum);
    app.store.touch('mirror');
  };

  return h(
    'div.field',
    {},
    label,
    h(
      'div.group',
      {},
      h('input.input', {
        type: 'range',
        min: '0',
        max: String(2 * state.project.canvas.width - 2),
        value: String(state.symmetry.axisSum),
        'aria-label': 'Mirror line position',
        id: 'mirror-line',
        style: { flex: '1' },
        oninput: slide,
      }),
      h('button.btn', { onclick: centre }, 'Centre on sprite'),
    ),
  );
}

export function renderColourPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);
  const pickColor = (color) => app.store.set({ color, tool: state.tool === 'eraser' ? 'pencil' : state.tool });

  replace(
    el,
    h('h2', { tabindex: '0' }, 'Colours', h('span.mono', {}, `${colors.length}`)),
    currentColour(app, colors),
    h('div.swatches', { role: 'group', 'aria-label': 'Character colours' }, colors.map((color) => swatch(color, state.color === color, () => pickColor(color), toHex(color)))),
    h('div.group', { style: { gap: '6px' } }, h('button.btn', { style: { flex: '1' }, onclick: () => openSwapSheet(app) }, icon('swap'), 'Swap colours…'), h('button.btn', { style: { flex: '1' }, onclick: () => openOutfitsSheet(app) }, profileOf(state.project).teamKits ? 'Team kits…' : 'Outfits…')),
  );
}

export function renderDrawingPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);

  replace(
    el,
    h('h2', { tabindex: '0' }, 'Drawing'),
    toggle('Clean lines', 'Removes doubled corners while you draw', state.cleanLines, (on) => app.store.set({ cleanLines: on }), 'clean-lines'),
    toggle('Palette lock', 'Draw only with the character colours', state.paletteLock, (on) => app.store.set({ paletteLock: on, color: on && !colors.includes(state.color) ? colors[0] : state.color }), 'palette-lock'),
    paintOverField(app, colors),
    toggle('Symmetry', 'Draw one half, the other side mirrors', state.symmetry.on, (on) => app.store.set({ symmetry: { ...state.symmetry, on } }), 'symmetry'),
    state.symmetry.on ? mirrorField(app) : null,
  );
}
