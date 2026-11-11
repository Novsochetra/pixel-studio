import { node } from '../dom.js';
import { fittedGridHeight, keepGridHeight, readGridHeight } from './grid-height.js';

const KEY_STEP = 16;
const KEY_DIRECTION = { ArrowUp: 1, ArrowDown: -1 };

function panelSizer({ layout, panel, handle }) {
  let wanted = readGridHeight();

  // the wanted height outlives a smaller window, so the frames grow back with it
  const show = () => {
    if (wanted === null) {
      panel.style.removeProperty('--grid-height');
    } else {
      const height = fittedGridHeight(wanted, layout.clientHeight);

      panel.style.setProperty('--grid-height', `${height}px`);
    }

    const share = (100 * panel.offsetHeight) / (layout.clientHeight || 1);

    handle.setAttribute('aria-valuenow', String(Math.round(share)));
  };

  return {
    show,
    set(height) {
      wanted = height === null ? null : fittedGridHeight(height, layout.clientHeight);
      show();
    },
    keep: () => keepGridHeight(wanted),
  };
}

function bindDrag(handle, panel, sizer) {
  let drag = null;
  const end = () => {
    if (drag) {
      drag = null;
      handle.classList.remove('dragging');
      sizer.keep();
    }
  };

  handle.addEventListener('pointerdown', (event) => {
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');
    drag = { startY: event.clientY, startHeight: panel.offsetHeight };
  });
  handle.addEventListener('pointermove', (event) => {
    if (drag) {
      sizer.set(drag.startHeight + drag.startY - event.clientY);
    }
  });
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

function bindKeys(handle, panel, sizer) {
  handle.addEventListener('keydown', (event) => {
    const direction = KEY_DIRECTION[event.key];

    if (!direction) {
      return;
    }

    // the page's own arrows nudge the selection, which is not what these mean here
    event.preventDefault();
    event.stopPropagation();
    sizer.set(panel.offsetHeight + direction * KEY_STEP);
    sizer.keep();
  });
}

export function mountGridResizer(layout, panel) {
  const handle = node('div.grid-resizer', {
    role: 'separator',
    tabIndex: 0,
    title: 'Drag to resize the frames. Double-click to fit them.',
    'aria-label': 'Resize the frames',
    'aria-orientation': 'horizontal',
  });
  const sizer = panelSizer({ layout, panel, handle });
  const observer = new ResizeObserver(() => {
    if (handle.isConnected) {
      sizer.show();
    } else {
      observer.disconnect();
    }
  });

  bindDrag(handle, panel, sizer);
  bindKeys(handle, panel, sizer);
  handle.addEventListener('dblclick', () => {
    sizer.set(null);
    sizer.keep();
  });
  layout.insertBefore(handle, panel);
  observer.observe(layout);
  observer.observe(panel);
  sizer.show();
}
