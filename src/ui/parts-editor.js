import { h } from './dom.js';
import { changeStructure } from './actions.js';
import { characterColors } from './character-colours.js';
import { sharedColours } from '../palette/kits.js';
import { newId } from '../model/project.js';
import { toHex } from '../model/sprite.js';

function partRow(app, part, colours, redraw) {
  const { project } = app.store.state;
  const save = () => {
    changeStructure(app, 'parts');
    redraw();
  };
  const toggle = (color) => {
    part.colours = part.colours.includes(color) ? part.colours.filter((c) => c !== color) : [...part.colours, color];
    save();
  };

  return h(
    'div.part-row',
    {},
    h('div.group', { style: { gap: '6px' } },
      h('input.input', { value: part.name, 'aria-label': 'Part name', onchange: (event) => { part.name = event.target.value.trim() || part.name; save(); } }),
      h('button.btn.quiet', { 'aria-label': `Remove ${part.name}`, title: 'Remove this part', onclick: () => { project.parts = project.parts.filter((p) => p !== part); save(); } }, '×')),
    h('div.target-picker', { style: { justifyContent: 'flex-start' } }, colours.map((color) => {
      const on = part.colours.includes(color);

      return h('button.swatch', {
        style: { background: toHex(color) },
        'aria-pressed': String(on),
        'aria-label': `${on ? 'Remove' : 'Add'} ${toHex(color)} ${on ? 'from' : 'to'} ${part.name}`,
        title: toHex(color),
        onclick: () => toggle(color),
      });
    })),
  );
}

// Which of the character's colours make up each part. An outfit recolours a part's colours
// shade for shade, darkest to lightest.
export function partsEditor(app, redraw) {
  const { project } = app.store.state;
  const colours = characterColors(app.store.state);
  const shared = sharedColours(project.parts);
  const add = () => {
    project.parts.push({ id: newId('part'), name: `Part ${project.parts.length + 1}`, colours: [] });
    changeStructure(app, 'parts');
    redraw();
  };

  return h(
    'div',
    { style: { display: 'grid', gap: '10px' } },
    h('p.hint', {}, 'Name a part (a shirt, a cape, armour) and tick the colours it is drawn in. Shades of one colour belong in one part.'),
    project.parts.map((part) => partRow(app, part, colours, redraw)),
    h('div.group', {}, h('button.btn', { onclick: add }, 'Add a part')),
    shared.length ? h('p.hint', { style: { color: 'var(--warn)' } }, `${shared.map(toHex).join(', ')} is in two parts, so those parts cannot wear different colours. Repaint one of them in its own shades.`) : null,
  );
}
