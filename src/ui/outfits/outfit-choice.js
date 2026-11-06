import { node, toast } from '../dom.js';
import { changeStructure } from '../actions.js';
import { outfitRamps } from '../../palette/kits.js';
import { newId } from '../../model/project.js';
import { gameOf } from '../../model/presets.js';
import { UNPICKED_PART } from '../../art/editor-colours.js';

// What an outfit is drawn from. choice: { source: 'team' | 'outfit' | 'custom', team, kit, outfit,
// custom }.

export const title = (id) =>
  id
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const savedOutfit = (project, choice) =>
  project.outfits.find((outfit) => outfit.id === choice.outfit);

// the ramps the choice gives each part: a Naga Eleven team, a saved outfit, or colours picked
export function chosenRamps(project, choice) {
  if (choice.source === 'team') {
    return globalThis.GAME_KITS?.kits?.[choice.team]?.[choice.kit] ?? {};
  }

  const bases =
    choice.source === 'outfit' ? (savedOutfit(project, choice)?.bases ?? {}) : choice.custom;

  return outfitRamps(project.parts, bases);
}

export function chosenName(project, choice) {
  if (choice.source === 'team') {
    return `${title(choice.team)} ${choice.kit}`;
  }

  return choice.source === 'outfit'
    ? (savedOutfit(project, choice)?.name ?? 'Outfit')
    : 'Custom colours';
}

function sourceValue(choice) {
  if (choice.source === 'team') {
    return `team:${choice.team}`;
  }

  return choice.source === 'outfit' ? `outfit:${choice.outfit}` : 'custom';
}

const CHOICE_OF = {
  team: (id) => ({ source: 'team', team: id }),
  outfit: (id) => ({ source: 'outfit', outfit: id }),
  custom: () => ({ source: 'custom' }),
};

function sourcePicker(project, choice, onChange) {
  const teams = gameOf(project).teamKits ? Object.keys(globalThis.GAME_KITS?.kits ?? {}) : [];
  const value = sourceValue(choice);
  const option = (id, label) => node('option', { value: id, selected: value === id }, label);
  const pick = (event) => {
    const [source, id] = event.target.value.split(':');
    onChange(CHOICE_OF[source](id));
  };

  return node(
    'select.input',
    { id: 'outfit-source', 'aria-label': 'Outfit', onchange: pick },
    teams.length
      ? node(
          'optgroup',
          { label: 'Naga Eleven teams' },
          teams.map((id) => option(`team:${id}`, title(id))),
        )
      : null,
    project.outfits.length
      ? node(
          'optgroup',
          { label: 'Your outfits' },
          project.outfits.map((outfit) => option(`outfit:${outfit.id}`, outfit.name)),
        )
      : null,
    option('custom', 'Pick colours…'),
  );
}

function kitButtons(choice, onChange) {
  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Kit' },
    ['home', 'away', 'keeper'].map((kit) =>
      node(
        'button',
        { 'aria-pressed': String(choice.kit === kit), onclick: () => onChange({ kit }) },
        title(kit),
      ),
    ),
  );
}

function pickedColours(project, choice, onChange) {
  return project.parts.map((part) =>
    node(
      'label.group',
      { style: { gap: '4px' } },
      node('input', {
        type: 'color',
        value: choice.custom[part.id] ?? UNPICKED_PART,
        'aria-label': `${part.name} colour`,
        oninput: (event) =>
          onChange({ custom: { ...choice.custom, [part.id]: event.target.value } }),
      }),
      part.name,
    ),
  );
}

function keepButton(app, choice, onChange) {
  const { project } = app.store.state;
  const keep = () => {
    const outfit = {
      id: newId('o'),
      name: `Outfit ${project.outfits.length + 1}`,
      bases: { ...choice.custom },
    };
    project.outfits.push(outfit);
    changeStructure(app, 'parts');
    onChange({ source: 'outfit', outfit: outfit.id });
    toast(`Kept as "${outfit.name}". Rename it in the parts list below.`);
  };

  return node('button.btn', { onclick: keep }, 'Keep these colours as an outfit');
}

// where the outfit comes from, then its kit or its colours
export function choiceControls(app, choice, onChange) {
  const { project } = app.store.state;
  const custom = choice.source === 'custom';

  return node(
    'div.group',
    { style: { gap: '8px', flexWrap: 'wrap' } },
    sourcePicker(project, choice, onChange),
    choice.source === 'team' ? kitButtons(choice, onChange) : null,
    custom ? pickedColours(project, choice, onChange) : null,
    custom && project.parts.length ? keepButton(app, choice, onChange) : null,
  );
}
