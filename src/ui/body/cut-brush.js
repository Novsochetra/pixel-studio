import { node } from '../dom.js';

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
    // beside the art, which part the next stroke is for: the list may be scrolled away from it
    node(
      'span.hint',
      {},
      `${job.erase ? 'Unpaints' : 'Paints'} ${job.plan.parts[job.selected]?.name ?? 'a part'}`,
    ),
  );
}
