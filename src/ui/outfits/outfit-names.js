import { icon, node } from '../dom.js';
import { byKeys, keysToPutBack, putBackRow, rename, takeOff } from '../put-back.js';
import { changeStructure } from '../actions.js';
import { listGroup } from '../list-group.js';

function outfitRow(app, { outfit, taken }, redraw) {
  const changed = () => {
    changeStructure(app, 'parts');
    redraw();
  };
  const named = (event) => {
    rename(app, { key: 'outfits', item: outfit, name: event.target.value.trim() });
    changed();
  };
  const remove = (event) => {
    const keys = byKeys(event);

    takeOff(app, { key: 'outfits', item: outfit, taken });
    redraw();

    if (keys) {
      keysToPutBack('outfits');
    }
  };

  return node(
    'div.list-row.guide-row',
    {},
    node('input.list-field.guide-name', {
      value: outfit.name,
      'aria-label': 'Outfit name',
      onchange: named,
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
