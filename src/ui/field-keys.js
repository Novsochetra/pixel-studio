import { letGoOf } from './keep-focus.js';

const isField = (target) => Boolean(target.matches?.('input:not([type="range"]), textarea'));

// what each field held when it was come to, or last said it had changed
function rememberFields(root) {
  const said = new WeakMap();
  const remember = ({ target }) => {
    if (isField(target)) {
      said.set(target, target.value);
    }
  };

  root.addEventListener('focusin', remember);
  root.addEventListener('change', remember, true);

  return said;
}

// A field says it has changed as it loses the focus. At a Tab that was too late: its bar was
// drawn again, and the control Tab was going to went with the old one, leaving the keys on
// nothing. The change is said at the key instead, so Tab goes on from the field now in its place.
function changeBeforeTab(root, said) {
  root.addEventListener(
    'keydown',
    ({ key, target }) => {
      if (key === 'Tab' && said.has(target) && said.get(target) !== target.value) {
        target.dispatchEvent(new window.Event('change', { bubbles: true }));
      }
    },
    true,
  );
}

// fields someone clicked into, until they are left
function clickedFields(root) {
  let pressed = null;
  const clicked = new WeakSet();

  root.addEventListener('pointerdown', ({ target }) => (pressed = target), true);
  root.addEventListener('focusin', ({ target }) => {
    if (isField(target) && target === pressed) {
      clicked.add(target);
    }

    // the click is spent: a field come back to with Tab is a keyboard's field again
    pressed = null;
  });
  root.addEventListener('focusout', ({ target }) => clicked.delete(target));

  return clicked;
}

// Enter in a field someone clicked into is the end of typing: the keys go back to the editor, so
// the B pressed next picks the Pencil. Left in the field, it was typed after the colour's code.
// Someone who came by Tab stays where they are. Escape leaves any field with what it held: in
// some it kept what was typed, where a name's field threw it away.
function leaveAtKeys(root, said) {
  const clicked = clickedFields(root);

  root.addEventListener(
    'keydown',
    ({ key, target }) => {
      if (!isField(target) || !(key === 'Escape' || (key === 'Enter' && clicked.has(target)))) {
        return;
      }

      if (key === 'Escape' && said.has(target)) {
        target.value = said.get(target);
      }

      letGoOf(target);
      // after the field has said its change, which Enter makes it do
      setTimeout(() => target.blur());
    },
    true,
  );
}

export function bindFieldKeys(root) {
  const said = rememberFields(root);

  changeBeforeTab(root, said);
  leaveAtKeys(root, said);
}
