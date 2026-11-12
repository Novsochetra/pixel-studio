import { node } from '../dom.js';

// On a phone the whole figure leaves a hand a few pixels wide: zoomed, the part picked fills
// the art's room, big enough to correct with a finger.
function zoomSwitch(job, change) {
  return node(
    `button.btn.quiet${job.zoomed ? '.on' : ''}`,
    {
      'aria-pressed': String(Boolean(job.zoomed)),
      title: 'Show the part picked close up, or the whole art',
      onclick: () => change(() => (job.zoomed = !job.zoomed)),
    },
    'Zoom to part',
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
    zoomSwitch(job, change),
  );
}
