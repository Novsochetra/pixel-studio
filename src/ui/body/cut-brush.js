import { icon, node } from '../dom.js';

// On a phone the whole figure leaves a hand a few pixels wide: zoomed, the part picked fills
// the art's room, big enough to correct with a finger. It stands under the art: at the end of
// the tools' row it was two scrolls past a phone's edge, and in the art's corner it lay over a
// short phone's art.
export function zoomSwitch(job, change) {
  return node(
    `button.btn.icon-only.cut-zoom${job.zoomed ? '.on' : ''}`,
    {
      'aria-label': 'Zoom to part',
      'aria-pressed': String(Boolean(job.zoomed)),
      title: 'Show the part picked close up, or the whole art',
      onclick: () => change(() => (job.zoomed = !job.zoomed)),
    },
    icon('search'),
  );
}

export function brushControls(job, change) {
  const choice = (label, pressed, onclick) =>
    node('button', { 'aria-pressed': String(pressed), onclick: () => change(onclick) }, label);

  const sizes = [1, 2, 4].map((size) =>
    choice(`${size} px`, job.brush === size, () => (job.brush = size)),
  );

  return node(
    'div.cut-brush',
    {},
    node(
      'div.segmented',
      { role: 'group', 'aria-label': 'Tool' },
      choice('Brush', job.tool === 'brush', () => (job.tool = 'brush')),
      choice('Lasso', job.tool === 'lasso', () => (job.tool = 'lasso')),
    ),
    node(
      'div.segmented',
      { role: 'group', 'aria-label': 'Give or take' },
      choice('Paint', !job.erase, () => (job.erase = false)),
      choice('Unpaint', job.erase, () => (job.erase = true)),
    ),
    job.tool === 'brush'
      ? node('div.segmented', { role: 'group', 'aria-label': 'Brush size' }, sizes)
      : null,
  );
}
