import { icon, node } from '../dom.js';
import { putBackRow, takeOff } from '../put-back.js';
import { changeStructure } from '../actions.js';
import { listGroup } from '../list-group.js';

function outfitRow(app, { outfit, taken }, redraw) {
  const changed = () => {
    changeStructure(app, 'parts');
    redraw();
  };
  const rename = (event) => {
    outfit.name = event.target.value.trim() || outfit.name;
    changed();
  };
  const remove = () => {
    takeOff(app, { key: 'outfits', item: outfit, taken });
    redraw();
  };

  return node(
    'div.list-row.guide-row',
    {},
    node('input.list-field.guide-name', {
      value: outfit.name,
      'aria-label': 'Outfit name',
      onchange: rename,
    }),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Remove ${outfit.name}`, onclick: remove },
      icon('close'),
    ),
  );
}

// the outfits kept with the project, to rename or remove
export function outfitNames(app, redraw, taken) {
  const { project } = app.store.state;

  if (!project.outfits.length && !taken.outfits) {
    return null;
  }

  return listGroup(
    { title: 'Your outfits' },
    project.outfits.map((outfit) => outfitRow(app, { outfit, taken }, redraw)),
    putBackRow(app, { key: 'outfits', taken }, redraw),
  );
}
