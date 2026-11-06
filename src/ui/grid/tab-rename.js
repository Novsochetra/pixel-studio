import { restructure } from '../actions.js';
import { renameInPlace } from '../rename-field.js';
import { uniqueName } from '../../model/structure.js';

function renameTo(app, animation, name) {
  restructure(app, 'Rename animation', (draft) => {
    const renamed = draft.project.animations.find((other) => other.id === animation.id);

    if (renamed) {
      renamed.name = uniqueName(draft.project, name, renamed);
    }
  });
}

export function rename(app, tabButton, animation) {
  renameInPlace(tabButton, {
    value: animation.name,
    label: 'Name',
    className: 'tab-rename',
    onDone: (name) => (name ? renameTo(app, animation, name) : app.store.touch('animations')),
  });
}
