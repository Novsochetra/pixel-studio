import { icon, node, replace, toast } from '../dom.js';
import { newProject } from '../../model/new-project.js';
import { startChoices } from '../../model/start-choices.js';
import { projectFields } from './fields.js';

function forgetButton(choice, onDelete) {
  return node(
    'button.btn.quiet.start-forget',
    {
      'aria-label': `Forget the ${choice.label} preset`,
      title: 'Forget this preset',
      onclick: (event) => {
        event.stopPropagation();
        onDelete(choice.preset);
      },
    },
    icon('close'),
  );
}

const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// as radio buttons do: the arrow keys pick the next or the one before, Enter or Space this one
function cardKey(event, choice, { order, onPick }) {
  if (event.key in STEPS) {
    event.preventDefault();
    const at = order.indexOf(choice);
    onPick(order[(at + STEPS[event.key] + order.length) % order.length], { focus: true });
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onPick(choice, { focus: true });
  }
}

// a card, and beside it (not in it, as a radio holds no button) Forget for a saved preset
function card(choice, picked, handlers) {
  return node(
    'div.start-choice',
    {},
    node(
      'div.start-card',
      {
        role: 'radio',
        tabindex: picked ? '0' : '-1',
        'aria-checked': String(picked),
        'data-choice': choice.id,
        onclick: () => handlers.onPick(choice),
        onkeydown: (event) => cardKey(event, choice, handlers),
      },
      icon(choice.icon),
      node('div', {}, node('strong', {}, choice.label), node('span', {}, choice.about)),
    ),
    choice.saved ? forgetButton(choice, handlers.onDelete) : null,
  );
}

function drawCards(el, saved, picked, handlers) {
  const { kinds, presets } = startChoices(saved);
  const order = [...kinds, ...presets];
  const drawCard = (choice) => card(choice, choice.id === picked.id, { ...handlers, order });

  replace(
    el,
    node(
      'div.start-cards',
      { role: 'radiogroup', 'aria-label': 'What are you making?' },
      kinds.map(drawCard),
    ),
    node('h4.start-heading', {}, 'Or start from a game preset'),
    node(
      'div.start-cards',
      { role: 'radiogroup', 'aria-label': 'Game presets' },
      presets.map(drawCard),
    ),
  );
}

// "What are you making?": a kind or a game preset, then a name and a canvas. onCreate gets the
// new project; onDeletePreset forgets a saved preset.
export function newProjectChooser({ presets, onCreate, onDeletePreset }) {
  const fields = projectFields();
  const cards = node('div');
  let saved = presets;
  let picked = startChoices(saved).kinds[0];
  const handlers = {
    onPick(choice, { focus = false } = {}) {
      picked = choice;
      fields.fill(choice.preset);
      drawCards(cards, saved, picked, handlers);

      if (focus) {
        cards.querySelector('.start-card[aria-checked="true"]')?.focus();
      }
    },
    onDelete(preset) {
      saved = saved.filter((entry) => entry !== preset);
      onDeletePreset(preset);
      handlers.onPick(picked.preset === preset ? startChoices(saved).kinds[0] : picked);
    },
  };
  const create = () => {
    const problem = fields.problem();

    if (problem) {
      toast(problem);
    } else {
      onCreate(newProject({ ...fields.read(), preset: picked.preset }));
    }
  };

  handlers.onPick(picked);

  return node(
    'div.start-chooser',
    {},
    node('h3.start-heading', {}, 'What are you making?'),
    cards,
    fields.el,
    node('div.sheet-actions', {}, node('button.btn.primary', { onclick: create }, 'Create')),
  );
}
