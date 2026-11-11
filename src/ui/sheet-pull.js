// A phone's window is pulled down by its bar to close it, as the grabber on it says. The window
// follows the finger; let go past a third of the way, or with a flick, and it closes.
const FLICK_PX_PER_MS = 0.5;
const CLOSES_PAST = 0.33;

const isCompact = () => document.documentElement.dataset.layout === 'compact';

function settle(body) {
  body.style.transition = 'translate var(--duration-normal) var(--ease-spring)';
  body.style.translate = '';
  body.addEventListener('transitionend', () => (body.style.transition = ''), { once: true });
}

function pull(body, event) {
  const startY = event.clientY;
  const startTime = event.timeStamp;
  const pulled = (now) => Math.max(0, now.clientY - startY);

  return {
    move(now) {
      body.style.translate = `0 ${pulled(now)}px`;
    },
    closes(now) {
      const speed = pulled(now) / Math.max(1, now.timeStamp - startTime);

      return pulled(now) > body.offsetHeight * CLOSES_PAST || speed > FLICK_PX_PER_MS;
    },
  };
}

// grips: says whether a press on the head takes hold of it, where the head is more than a bar
export function pullToClose({ head, body, close, grips = () => true }) {
  let drag = null;
  const stop = (event) => {
    if (!drag) {
      return;
    }

    const closes = event.type === 'pointerup' && drag.closes(event);

    drag = null;
    closes ? close() : settle(body);
  };

  head.addEventListener('pointerdown', (event) => {
    if (isCompact() && !event.target.closest('button') && grips(event)) {
      drag = pull(body, event);
      head.setPointerCapture(event.pointerId);
    }
  });
  head.addEventListener('pointermove', (event) => drag?.move(event));
  head.addEventListener('pointerup', stop);
  head.addEventListener('pointercancel', stop);
}
