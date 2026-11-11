import { node } from './dom.js';
import { afterPress } from './after-press.js';

// A name edited in place of `shown`: Enter or leaving it keeps the new name, Escape the old.
// onDone(name) gets the new name, or null when nothing changed.
export function renameInPlace(shown, { value, label, className, onDone }) {
  const field = node(`input.input${className ? `.${className}` : ''}`, {
    value,
    'aria-label': label,
  });
  const done = (keep, byKey = false) => {
    const name = field.value.trim();

    field.onblur = null;
    field.replaceWith(shown);

    // the keys go back to what was named: left on nothing, the next Tab began the page again
    if (byKey) {
      (shown.closest('button, [tabindex]') ?? shown).focus?.();
    }

    onDone(keep && name && name !== value ? name : null);
  };

  field.addEventListener('keydown', (event) => {
    event.stopPropagation();

    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      done(event.key === 'Enter', true);
    }
  });
  field.onblur = () => afterPress(() => done(true));
  shown.replaceWith(field);
  field.select();
}
