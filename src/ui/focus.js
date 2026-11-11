const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

// What can take the focus now: a field in a part that is folded shut cannot, and asking it to
// left the focus on the button behind the window (Enter then opened the window twice).
const foldedShut = (element) =>
  Boolean(element.closest('details:not([open])')) && !element.closest('summary');

export function focusables(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter(
    (element) => !element.closest('[hidden]') && !foldedShut(element),
  );
}

// The control that opened a sheet or menu is often drawn again while it is open, so focus goes
// back to the one now in its place: the same id, or the same kind of control with the same label.
export function rememberFocus() {
  const opener = document.activeElement;
  const label = opener?.getAttribute?.('aria-label');
  const findReplacement = () => {
    if (opener?.id) {
      return document.getElementById(opener.id);
    }

    return label
      ? document.querySelector(`${opener.tagName}[aria-label="${CSS.escape(label)}"]`)
      : null;
  };

  return () => {
    const target = opener?.isConnected ? opener : findReplacement();

    target?.focus?.();
  };
}

// Tab and Shift Tab go round the controls inside, never out to the page behind
export function trapTab(container, event) {
  const controls = focusables(container);

  if (event.key !== 'Tab' || !controls.length) {
    return;
  }

  const first = controls[0];
  const last = controls.at(-1);
  const inside = container.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

// what a control is known by when its bar is drawn again: the part of the page it stands in,
// its name or its words, and how far along it stood
function placeOf(control, root) {
  const region = control.closest('[id]');
  const within = region && root.contains(region) ? region : root;

  return {
    id: control.id,
    region: within === root ? '' : within.id,
    tag: control.tagName,
    label: control.getAttribute('aria-label'),
    words: control.textContent.trim(),
    index: focusables(within).indexOf(control),
  };
}

function nowAt(place, root) {
  if (place.id) {
    return document.getElementById(place.id);
  }

  const controls = focusables((place.region && document.getElementById(place.region)) || root);
  const nearest = (matches) =>
    matches.reduce(
      (best, control) =>
        Math.abs(controls.indexOf(control) - place.index) <
        Math.abs(controls.indexOf(best) - place.index)
          ? control
          : best,
      matches[0],
    );
  const named = controls.filter(
    (control) =>
      control.tagName === place.tag &&
      (place.label
        ? control.getAttribute('aria-label') === place.label
        : place.words && control.textContent.trim() === place.words),
  );

  return nearest(named) ?? controls[Math.min(place.index, controls.length - 1)];
}

// The bars are drawn again at every change, and the control that made the change goes with the
// old ones: the keys are handed to the one now in its place, so Enter, the arrows and Tab go on
// from there. Only for someone using the keys (:focus-visible): after a click the keys stay the
// editor's own, and Space pans.
export function keepFocus(root, draw) {
  const held = document.activeElement;
  const place =
    held && root.contains(held) && held.matches(':focus-visible') ? placeOf(held, root) : null;

  draw();

  if (place && !held.isConnected && !root.contains(document.activeElement)) {
    nowAt(place, root)?.focus({ preventScroll: true });
  }
}

// A field says it has changed as it loses the focus. At a Tab that was too late: its bar was
// drawn again, and the control Tab was going to went with the old one, leaving the keys on
// nothing. The change is said at the key instead, so Tab goes on from the field now in its place.
export function changeBeforeTab(root) {
  const said = new WeakMap();
  const remember = ({ target }) => {
    if (target.matches?.('input, textarea')) {
      said.set(target, target.value);
    }
  };

  root.addEventListener('focusin', remember);
  root.addEventListener('change', remember, true);
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
