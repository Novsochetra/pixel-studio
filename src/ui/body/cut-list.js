import { icon, node } from '../dom.js';
import {
  addPart,
  followersOf,
  movePart,
  partSizes,
  removePart,
} from '../../model/body/cut-plan.js';
import { partColour } from './cut-canvas.js';

// The parts, top one first as layers are listed: pick one to paint it, name it, say which part it
// follows (turning that part carries this one), and set what is drawn over what.

function followsPicker(job, part, change) {
  const taken = followersOf(job.plan, part.id);
  const choices = job.plan.parts.filter((other) => other !== part && !taken.has(other.id));
  const choose = (event) => change(() => (part.parent = event.target.value || null));

  return node(
    'select.input',
    {
      'aria-label': `What ${part.name} follows`,
      title: 'Turning that part carries this one',
      onchange: choose,
    },
    node('option', { value: '', selected: !part.parent }, 'Follows nothing'),
    choices.map((other) =>
      node(
        'option',
        { value: other.id, selected: part.parent === other.id },
        `Follows ${other.name}`,
      ),
    ),
  );
}

function orderButtons(job, index, change) {
  const last = job.plan.parts.length - 1;
  const move = (step) => change(() => (job.selected = movePart(job.plan, index, step)));

  return [
    node(
      'button.btn.quiet.icon-only',
      {
        'aria-label': 'Draw over the part above',
        disabled: index === last,
        onclick: () => move(1),
      },
      '↑',
    ),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': 'Draw under the part below', disabled: index === 0, onclick: () => move(-1) },
      '↓',
    ),
  ];
}

function partRow(job, { part, index, size }, change) {
  const picked = index === job.selected;
  const rename = (event) => change(() => (part.name = event.target.value.trim() || part.name));
  const remove = () =>
    change(() => {
      removePart(job.plan, index);
      job.selected = Math.max(0, Math.min(job.selected, job.plan.parts.length - 1));
    });

  return node(
    `div.cut-part${picked ? '.picked' : ''}`,
    { role: 'listitem', 'data-part': part.id },
    node('button.cut-swatch', {
      style: { background: partColour(index) },
      'aria-pressed': String(picked),
      'aria-label': `Paint ${part.name}`,
      title: 'Paint this part',
      onclick: () => change(() => (job.selected = index)),
    }),
    node('input.input', { value: part.name, 'aria-label': 'Part name', onchange: rename }),
    followsPicker(job, part, change),
    node('small.cut-size', {}, size ? `${size} px` : 'empty'),
    orderButtons(job, index, change),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Remove ${part.name}`, onclick: remove },
      icon('close'),
    ),
  );
}

// beside: what else acts on every part, shown beside Add a part
export function partsList(job, change, beside = null) {
  const sizes = partSizes(job.plan);
  const rows = job.plan.parts.map((part, index) => ({ part, index, size: sizes[index] })).reverse();
  const add = () =>
    change(() => {
      const parent = job.plan.parts[job.selected]?.id ?? null;

      job.selected = addPart(job.plan, { name: `Part ${job.plan.parts.length + 1}`, parent });
    });

  return node(
    'div.cut-parts',
    {},
    node(
      'div',
      { role: 'list', 'aria-label': 'Parts, top first' },
      rows.map((row) => partRow(job, row, change)),
    ),
    node(
      'div.group',
      {},
      node('button.btn.quiet', { onclick: add }, icon('plus'), 'Add a part'),
      beside,
    ),
  );
}
