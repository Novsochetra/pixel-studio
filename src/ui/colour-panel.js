import { node, icon, replace } from './dom.js';
import { characterColors } from './character-colours.js';
import { CLEAR, fromHex, toHex } from '../model/sprite.js';
import { drawingSettings } from './drawing-settings.js';
import { openSwapSheet } from './swap-sheet.js';
import { openOutfitsSheet } from './outfits-sheet.js';
import { gameOf } from '../model/presets.js';
import { kindOf } from '../model/kinds.js';

function swatch(color, pressed, onclick, title) {
  return node(`button.swatch${color === CLEAR ? '.clear' : ''}`, {
    style: color === CLEAR ? null : { background: toHex(color) },
    title,
    'aria-label': title,
    'aria-pressed': String(pressed),
    onclick,
  });
}

function currentColour(app, colors) {
  const { state } = app.store;
  const hex = node('input.input.mono', {
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

  return node(
    'div.current-colour',
    {},
    node('div.swatch', { style: { background: toHex(state.color) }, 'aria-hidden': 'true' }),
    node(
      'div.field',
      {},
      hex,
      node('span', {}, outside ? 'Not one of the character colours yet' : 'Character colour'),
    ),
  );
}

function colourButtons(app) {
  const { project } = app.store.state;

  return node(
    'div.group',
    { style: { gap: '6px' } },
    node(
      'button.btn',
      { style: { flex: '1' }, onclick: () => openSwapSheet(app) },
      icon('swap'),
      'Swap colours…',
    ),
    // outfits recolour a character's or an object's parts; tiles, effects and icons have none
    kindOf(project).place === 'feet'
      ? node(
          'button.btn',
          { style: { flex: '1' }, onclick: () => openOutfitsSheet(app) },
          gameOf(project).teamKits ? 'Team kits…' : 'Outfits…',
        )
      : null,
  );
}

export function renderColourPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);
  const pickColor = (color) =>
    app.store.set({ color, tool: state.tool === 'eraser' ? 'pencil' : state.tool });

  replace(
    el,
    node('h2', {}, 'Colours', node('span.mono', {}, `${colors.length}`)),
    currentColour(app, colors),
    node(
      'div.swatches',
      { role: 'group', 'aria-label': 'Character colours' },
      colors.map((color) =>
        swatch(color, state.color === color, () => pickColor(color), toHex(color)),
      ),
    ),
    colourButtons(app),
    drawingSettings(app, colors),
  );
}
