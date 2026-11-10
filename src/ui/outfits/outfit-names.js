import { icon, node } from '../dom.js';
import { changeStructure } from '../actions.js';

function outfitRow(app, outfit, redraw) {
  const { project } = app.store.state;
  const changed = () => {
    changeStructure(app, 'parts');
    redraw();
  };
  const rename = (event) => {
    outfit.name = event.target.value.trim() || outfit.name;
    changed();
  };
  const remove = () => {
    project.outfits = project.outfits.filter((other) => other !== outfit);
    changed();
  };

  return node(
    'div.group',
    { style: { gap: '6px' } },
    node('input.input', { value: outfit.name, 'aria-label': 'Outfit name', onchange: rename }),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Remove ${outfit.name}`, onclick: remove },
      icon('close'),
    ),
  );
}

// the outfits kept with the project, to rename or remove
export function outfitNames(app, redraw) {
  const { project } = app.store.state;

  if (!project.outfits.length) {
    return null;
  }

  return node(
    'div.field',
    {},
    node('span', {}, 'Your outfits'),
    project.outfits.map((outfit) => outfitRow(app, outfit, redraw)),
  );
}
