import { node } from './dom.js';

// Leaving the field with a press on something else: the change is made only once the press is
// over, so the click still lands on what it was meant for before the list is drawn again.
function afterPress(pressing, then) {
  if (pressing()) {
    window.addEventListener('pointerup', () => setTimeout(then), { once: true, capture: true });
  } else {
    then();
  }
}

// A name edited in place of `shown`: Enter or leaving it keeps the new name, Escape the old.
// onDone(name) gets the new name, or null when nothing changed.
export function renameInPlace(shown, { value, label, className, onDone }) {
  const field = node(`input.input${className ? `.${className}` : ''}`, {
    value,
    'aria-label': label,
  });
  let pressed = false;
  const press = () => (pressed = true);
  const release = () => (pressed = false);
  const done = (keep) => {
    const name = field.value.trim();

    document.removeEventListener('pointerdown', press, true);
    document.removeEventListener('pointerup', release, true);
    field.onblur = null;
    field.replaceWith(shown);
    onDone(keep && name && name !== value ? name : null);
  };

  field.addEventListener('keydown', (event) => {
    event.stopPropagation();

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
  shown.replaceWith(field);
  field.select();
}
