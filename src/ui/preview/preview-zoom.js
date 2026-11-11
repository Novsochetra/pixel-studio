import { node } from '../dom.js';

const ZOOMS = { scene: [1, 2, 3], tiled: [1, 2, 4], centred: [1] };
const TILES_ACROSS = 8;
const MARGIN = 32;

// how wide the window leaves the preview
export const roomFor = (canvas) => (canvas.closest('.stage')?.clientWidth ?? 0) - MARGIN;

// Until a zoom is picked: a scene at its own size; tiles as big as the window has room for, to
// see each pixel. At 4× on a phone the tiles were wider than the screen, their controls with them.
function startZoom(state, mode, room) {
  if (mode !== 'tiled') {
    return 1;
  }

  const across = state.project.canvas.width * TILES_ACROSS;

  return [4, 2].find((zoom) => across * zoom <= room) ?? 1;
}

export const zoomOf = (state, mode, room) => state.game.zoom ?? startZoom(state, mode, room);

export function zoomButtons(mode, picked, set) {
  const zooms = ZOOMS[mode];

  return zooms.length > 1
    ? node(
        'div.segmented',
        { role: 'group', 'aria-label': 'Zoom' },
        zooms.map((zoom) =>
          node(
            'button',
            { 'aria-pressed': String(picked === zoom), onclick: () => set({ zoom }) },
            `${zoom}×`,
          ),
        ),
      )
    : null;
}
