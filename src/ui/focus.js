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
