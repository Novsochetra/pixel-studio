import { h, replace, toast } from './dom.js';
import { allArtLayers, commit, currentLayer, directionSprite } from './actions.js';
import { addOutline, closeGaps, outlineColour, previewOutline, thinOutline } from '../editor/outline.js';
import { toHex } from '../model/sprite.js';
import { characterColors } from './character-colours.js';

const OPERATIONS = [
  { id: 'thin', label: 'Thin a doubled outline', run: thinOutline, hint: 'Outer outline pixels that only back onto more outline' },
  { id: 'gaps', label: 'Close gaps in the outline', run: closeGaps, hint: 'Edge pixels between two outline pixels' },
  { id: 'add', label: 'Add an outline around everything', run: addOutline, hint: 'One pixel outside the whole shape' },
];

export function renderOutlinePanel(el, app) {
  const { state } = app.store;
  const layer = currentLayer(state);
  const detected = outlineColour(directionSprite(state, state.at.direction));
  state.outline ??= { colour: null, everywhere: false };
  const colour = state.outline.colour ?? detected;
  const colours = characterColors(state);
  const apply = (operation) => {
    const layers = state.outline.everywhere ? allArtLayers(state) : [layer];
    let count = 0;
    commit(app, operation.label, layers, () => layers.forEach((l) => { count += operation.run(l.sprite, colour); }));
    toast(count ? `${operation.label}: ${count} pixels changed` : 'Nothing to change');
  };

  replace(
    el,
    h('h2', { tabindex: '0' }, 'Outline'),
    h('label.field', { for: 'outline-colour' }, h('span', {}, 'Outline colour (found on the edge)'), h('select.input.mono', { id: 'outline-colour', onchange: (event) => { state.outline = { ...state.outline, colour: Number(event.target.value) }; app.store.touch('outline'); } }, colours.map((c) => h('option', { value: String(c), selected: c === colour }, toHex(c))))),
    OPERATIONS.map((operation) => {
      const { count, points } = colour === null ? { count: 0, points: [] } : previewOutline(layer.sprite, operation.run, colour);

      return h('button.btn', {
        title: `${operation.hint}. Hover to see them on the canvas.`,
        disabled: !count && !state.outline.everywhere,
        onclick: () => { app.store.set({ highlight: null }); apply(operation); },
        onmouseenter: () => app.store.set({ highlight: points }),
        onmouseleave: () => app.store.set({ highlight: null }),
        onfocus: () => app.store.set({ highlight: points }),
        onblur: () => app.store.set({ highlight: null }),
      }, `${operation.label} (${count} here)`);
    }),
    h('label.toggle-row', { for: 'outline-everywhere' }, h('span', {}, h('div', {}, 'Every frame and view'), h('div.hint', {}, 'Off: only the layer you are editing')), h('input.switch', { type: 'checkbox', role: 'switch', id: 'outline-everywhere', checked: state.outline.everywhere, onchange: (event) => { state.outline = { ...state.outline, everywhere: event.target.checked }; app.store.touch('outline'); } })),
  );
}
