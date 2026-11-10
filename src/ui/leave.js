// What is closed plays its way out under another class: the page, and whatever asks it what is
// open, counts it gone at once, while the eye sees it leave.
const LONGEST_MS = 700;

function plays(el) {
  return getComputedStyle(el).animationName !== 'none';
}

// nothing in it can be pressed, read out or found by its id while it goes
function stepAside(el) {
  el.inert = true;
  el.setAttribute('aria-hidden', 'true');
  el.querySelectorAll('[id]').forEach((part) => part.removeAttribute('id'));
}

export function leave(el, className) {
  // already taken away with the page drawn over it
  if (!el.isConnected) {
    el.remove();

    return;
  }

  el.className = className;
  stepAside(el);

  // someone who asked for less motion has nothing to watch
  if (!plays(el)) {
    el.remove();

    return;
  }

  el.addEventListener('animationend', (event) => {
    if (event.target === el) {
      el.remove();
    }
  });
  setTimeout(() => el.remove(), LONGEST_MS);
}
