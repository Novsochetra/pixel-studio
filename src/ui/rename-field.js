import { node } from './dom.js';
import { afterPress } from './after-press.js';

// A name edited in place of `shown`: Enter or leaving it keeps the new name, Escape the old.
// onDone(name, how) gets the new name, or null when nothing changed, and how the field was
// left: 'enter', 'escape', 'tab' or 'blur'.
export function renameInPlace(shown, { value, label, className, onDone }) {
  const field = node(`input.input${className ? `.${className}` : ''}`, {
    value,
    'aria-label': label,
  });
  const done = (how) => {
    const keep = how !== 'escape';
    const name = field.value.trim();

    field.onblur = null;
    field.replaceWith(shown);

    // the keys go back to what was named: left on nothing, the next Tab began the page again
    if (how !== 'blur') {
      (shown.closest('button, [tabindex]') ?? shown).focus?.();
    }

    onDone(keep && name && name !== value ? name : null, how);
  };

  field.addEventListener('keydown', (event) => {
    event.stopPropagation();

    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      done(event.key === 'Enter' ? 'enter' : 'escape');
    }

    // The name is kept at the key, and Tab goes on from what was named. Kept as the field lost
    // the focus, the list was drawn again under the control Tab was going to, and the keys
    // were left on nothing.
    if (event.key === 'Tab') {
      done('tab');
    }
  });
  field.onblur = () => afterPress(() => done('blur'));
  shown.replaceWith(field);
  field.select();
}
