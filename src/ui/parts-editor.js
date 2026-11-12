import { icon, node } from './dom.js';
import { byKeys, keysToPutBack, putBackRow, rename, takeOff } from './put-back.js';
import { changeStructure } from './actions.js';
import { characterColors } from './character-colours.js';
import { sharedColours } from '../palette/kits.js';
import { newId } from '../model/project.js';
import { toHex } from '../model/sprite.js';
import { listGroup } from './list-group.js';

// a colour button for a part: pressed when the part is drawn in it
function colourChip(part, color, toggle) {
  const on = part.colours.includes(color);
  const hex = toHex(color);

  return node('button.swatch', {
    style: { background: hex },
    'aria-pressed': String(on),
    'aria-label': `${on ? 'Remove' : 'Add'} ${hex} ${on ? 'from' : 'to'} ${part.name}`,
    title: hex,
    onclick: () => toggle(color),
  });
}

function nameAndRemove(app, { part, taken }, save) {
  const named = (event) => {
    rename(app, { key: 'parts', item: part, name: event.target.value.trim() });
    save();
  };
  const remove = (event) => {
    const keys = byKeys(event);

    takeOff(app, { key: 'parts', item: part, taken });
    save();

    if (keys) {
      keysToPutBack('parts');
    }
  };

  return node(
    'div.list-row',
    {},
    node('input.list-field.guide-name', {
      value: part.name,
      'aria-label': 'Part name',
      onchange: named,
    }),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Remove ${part.name}`, title: 'Remove this part', onclick: remove },
      icon('close'),
    ),
  );
}

function partRow(app, { part, colours, taken }, redraw) {
  const save = () => {
    changeStructure(app, 'parts');
    redraw();
  };
  const toggle = (color) => {
    part.colours = part.colours.includes(color)
      ? part.colours.filter((colour) => colour !== color)
      : [...part.colours, color];
    save();
  };

  // a part is a group of rows, as a guide is: its name, then the colours it is drawn in
  const group = listGroup(
    {},
    nameAndRemove(app, { part, taken }, save),
    node(
      'div.list-row.target-picker',
      { style: { justifyContent: 'flex-start' } },
      colours.map((color) => colourChip(part, color, toggle)),
    ),
  );

  group.classList.add('part-row', 'guide-row');

  return group;
}

// Which of the character's colours make up each part. An outfit recolours a part's colours
// shade for shade, darkest to lightest.
export function partsEditor(app, redraw, taken) {
  const { project } = app.store.state;
  const colours = characterColors(app.store.state);
  const shared = sharedColours(project.parts);
  const back = putBackRow(app, { key: 'parts', taken }, redraw);
  const add = () => {
    project.parts.push({
      id: newId('part'),
      name: `Part ${project.parts.length + 1}`,
      colours: [],
    });
    changeStructure(app, 'parts');
    redraw();
  };

  return node(
    'div',
    { style: { display: 'grid', gap: '10px' } },
    node(
      'p.hint',
      {},
      'Name a part (a shirt, a cape, armour) and tick the colours it is drawn in. Shades of one colour belong in one part.',
    ),
    project.parts.map((part) => partRow(app, { part, colours, taken }, redraw)),
    back ? listGroup({}, back) : null,
    node('div.group', {}, node('button.btn', { onclick: add }, 'Add a part')),
    shared.length
      ? node(
          'p.hint',
          { style: { color: 'var(--warn)' } },
          `${shared.map(toHex).join(', ')} is in two parts, so those parts cannot wear different colours. Repaint one of them in its own shades.`,
        )
      : null,
  );
}
