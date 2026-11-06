import { node } from '../dom.js';
import { restructure } from '../actions.js';
import { uniqueName } from '../../model/structure.js';

// Leaving the field with a press on another tab: the bar is drawn again only once the press is
// over, so the click still lands on the tab it was meant for.
function afterPress(pressing, then) {
  if (pressing()) {
    window.addEventListener('pointerup', () => setTimeout(then), { once: true, capture: true });
  } else {
    then();
  }
}

function renameTo(app, animation, name) {
  restructure(app, 'Rename animation', (draft) => {
    const renamed = draft.project.animations.find((other) => other.id === animation.id);

    if (renamed) {
      renamed.name = uniqueName(draft.project, name, renamed);
    }
  });
}

// the tab turns into a text field; Enter or leaving it renames, Escape keeps the name
export function rename(app, tabButton, animation) {
  const field = node('input.input.tab-rename', { value: animation.name, 'aria-label': 'Name' });
  let pressed = false;
  const press = () => (pressed = true);
  const release = () => (pressed = false);
  const done = (keep) => {
    const name = field.value.trim();
    document.removeEventListener('pointerdown', press, true);
    document.removeEventListener('pointerup', release, true);
    field.onblur = null;

    if (keep && name && name !== animation.name) {
      renameTo(app, animation, name);
    } else {
      app.store.touch('animations');
    }
  };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      done(event.key === 'Enter');
    }
  });
  document.addEventListener('pointerdown', press, true);
  document.addEventListener('pointerup', release, true);
  field.onblur = () =>
    afterPress(
      () => pressed,
      () => done(true),
    );
  tabButton.replaceWith(field);
  field.select();
}
