import { icon, node } from '../dom.js';
import { afterPress } from '../after-press.js';
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
      icon('chevron-up'),
    ),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': 'Draw under the part below', disabled: index === 0, onclick: () => move(-1) },
      icon('chevron-down'),
    ),
  ];
}

function partRow(job, { part, index, size }, change) {
  const picked = index === job.selected;
  // The list is drawn again once the press that took the focus from the name has had its
  // click: drawn at once, the button pressed went with the old list and the press did nothing.
  const rename = (event) => {
    const name = event.target.value.trim() || part.name;

    afterPress(() => change(() => (part.name = name)));
  };
  const remove = (event) => {
    const keys = event.currentTarget.matches(':focus-visible');

    change(() => {
      removePart(job.plan, index);
      job.selected = Math.max(0, Math.min(job.selected, job.plan.parts.length - 1));
    });

    // With the keys they go to Undo, which takes the removal back: on the next part's Remove,
    // Enter after Enter removed part after part.
    if (keys) {
      document.querySelector('.sheet .cut-undo button')?.focus();
    }
  };

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
