// The thumb of a segmented control slides to the option picked, as the arcade's does. The bars
// are drawn again on every change, so the thumb of a control just drawn starts from where the
// thumb of the one before it stood: remembered by the control's name.
const lastPlaces = new Map();
const placed = new WeakMap();

const nameOf = (control) => control.getAttribute('aria-label');

function placeOf(control) {
  const pressed = control.querySelectorAll(':scope > [aria-pressed="true"]');

  // nothing to measure while its panel is shut, and no one thumb when several options are on
  if (pressed.length !== 1 || !pressed[0].offsetWidth) {
    return null;
  }

  const [option] = pressed;

  return {
    x: option.offsetLeft,
    y: option.offsetTop,
    width: option.offsetWidth,
    height: option.offsetHeight,
    across: control.offsetWidth,
  };
}

function putThumb(control, place) {
  control.style.setProperty('--thumb-x', `${place.x}px`);
  control.style.setProperty('--thumb-y', `${place.y}px`);
  control.style.setProperty('--thumb-width', `${place.width}px`);
  control.style.setProperty('--thumb-height', `${place.height}px`);
}

// a thumb slides along its row only: from a control of another size or row it would fly in
export const slidesFrom = (from, to) =>
  Boolean(from) && from.across === to.across && from.y === to.y && from.x !== to.x;

function placeThumb(control, slide) {
  const place = placeOf(control);
  const from = control.dataset.thumb ? null : lastPlaces.get(nameOf(control));

  if (!place) {
    delete control.dataset.thumb;

    return;
  }

  if (slide && slidesFrom(from, place)) {
    putThumb(control, from);
    control.dataset.thumb = 'still';
    // the thumb is drawn where it was before it is told where to go
    control.getBoundingClientRect();
  }

  control.dataset.thumb = slide ? 'sliding' : 'still';
  putThumb(control, place);
  lastPlaces.set(nameOf(control), place);
  placed.set(control, place);
}

const samePlace = (one, other) =>
  Boolean(one && other) && Object.keys(one).every((key) => one[key] === other[key]);

// a thumb already where it should be is left alone: it may be on its way there
function keepThumb(control) {
  if (!samePlace(placed.get(control), placeOf(control))) {
    placeThumb(control, false);
  }
}

const controlsIn = (nodes) =>
  [...nodes]
    .filter((added) => added.nodeType === Node.ELEMENT_NODE)
    .flatMap((added) => [
      ...(added.matches('.segmented') ? [added] : []),
      ...added.querySelectorAll('.segmented'),
    ]);

export function watchSegmented() {
  // its size changes when its panel opens, the window turns or the type arrives
  // a frame later: a thumb moved while the sizes are being told makes Safari report a loop
  const sizes = new ResizeObserver((entries) =>
    requestAnimationFrame(() => entries.forEach((entry) => keepThumb(entry.target))),
  );
  const changes = new MutationObserver((records) => {
    for (const record of records) {
      controlsIn(record.removedNodes).forEach((control) => sizes.unobserve(control));
      controlsIn(record.addedNodes).forEach((control) => {
        placeThumb(control, true);
        sizes.observe(control);
      });

      const control = record.type === 'attributes' && record.target.closest('.segmented');

      if (control) {
        placeThumb(control, true);
      }
    }
  });

  changes.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed'],
  });
}
