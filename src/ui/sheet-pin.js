// A window open on a desk keeps its top where it opened, and grows or shrinks at its foot. Centred,
// it moved up and down as what it shows grew (the sprite sheet's picture with a frame size typed),
// and the second click of a double-click landed on the field above the one clicked. A phone's
// window stands at the screen's foot, and rises as it grows, as a phone's sheets do.
const SETTLES_MS = 600;

export function pinTop(body, backdrop) {
  let top = null;

  const pin = () => {
    const compact = document.documentElement.dataset.layout === 'compact';

    if (!body.isConnected || compact) {
      return;
    }

    const box = body.getBoundingClientRect();
    const room = backdrop.getBoundingClientRect();

    top ??= box.top - room.top;
    body.style.alignSelf = 'start';
    body.style.marginTop = `${Math.max(0, top - parseFloat(getComputedStyle(backdrop).paddingTop))}px`;
    body.style.maxHeight = `calc(100% - ${body.style.marginTop})`;
  };

  // the first size it takes is the one it opened at: pinned once it has settled, or at once
  // where motion is turned off and no animation ends
  const settled = () => top === null && pin();

  body.addEventListener('animationend', settled, { once: true });
  setTimeout(settled, SETTLES_MS);
  new ResizeObserver(() => top !== null && pin()).observe(body);
}
