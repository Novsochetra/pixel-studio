import { icon, node, replace } from '../dom.js';
import { newProject } from '../../model/new-project.js';
import { startChoices, startingGuides } from './choices.js';
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

function card(choice, picked, { onPick, onDelete }) {
  return node(
    'div.start-card',
    {
      role: 'radio',
      tabindex: '0',
      'aria-checked': String(picked),
      onclick: () => onPick(choice),
      onkeydown: (event) => (event.key === 'Enter' || event.key === ' ') && onPick(choice),
    },
    icon(choice.icon),
    node('div', {}, node('strong', {}, choice.label), node('span', {}, choice.about)),
    choice.saved ? forgetButton(choice, onDelete) : null,
  );
}

function drawCards(el, saved, picked, handlers) {
  const { kinds, presets } = startChoices(saved);
  const one = (choice) => card(choice, choice.id === picked.id, handlers);

  replace(
    el,
    node(
      'div.start-cards',
      { role: 'radiogroup', 'aria-label': 'What are you making?' },
      kinds.map(one),
    ),
    node('h4.start-heading', {}, 'Or start from a game preset'),
    node('div.start-cards', { role: 'radiogroup', 'aria-label': 'Game presets' }, presets.map(one)),
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
    onPick(choice) {
      picked = choice;
      fields.fill(choice.preset);
      drawCards(cards, saved, picked, handlers);
    },
    onDelete(preset) {
      saved = saved.filter((entry) => entry !== preset);
      onDeletePreset(preset);
      handlers.onPick(picked.preset === preset ? startChoices(saved).kinds[0] : picked);
    },
  };
  const create = () => {
    const options = fields.read();
    const project = newProject({ ...options, preset: picked.preset });
    project.guides = startingGuides(picked.preset, options.height);
    onCreate(project);
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
