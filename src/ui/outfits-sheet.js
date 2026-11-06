import { node, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { allArtLayers, changeStructure, commit } from './actions.js';
import { boardPreview } from './board-canvas.js';
import { partsEditor } from './parts-editor.js';
import { kitMapping, outfitRamps } from '../palette/kits.js';
import { applyMapping } from '../palette/palette.js';
import { newId } from '../model/project.js';
import { gameOf } from '../model/presets.js';
import { keepVersion } from './versions-sheet.js';
import { downloadOutfit, keepAsSwap } from './outfit-files.js';

const title = (id) =>
  id
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
// the ramps the current choice gives each part: a Naga Eleven team, a saved outfit, or colours
function chosenRamps(project, choice) {
  if (choice.source === 'team') {
    return globalThis.GAME_KITS?.kits?.[choice.team]?.[choice.kit] ?? {};
  }

  if (choice.source === 'outfit') {
    return outfitRamps(
      project.parts,
      project.outfits.find((outfit) => outfit.id === choice.outfit)?.bases ?? {},
    );
  }

  return outfitRamps(project.parts, choice.custom);
}

function chosenName(project, choice) {
  if (choice.source === 'team') {
    return `${title(choice.team)} ${choice.kit}`;
  }

  return choice.source === 'outfit'
    ? (project.outfits.find((outfit) => outfit.id === choice.outfit)?.name ?? 'Outfit')
    : 'Custom colours';
}

function sourcePicker(project, choice, onChange) {
  const teams = gameOf(project).teamKits ? Object.keys(globalThis.GAME_KITS?.kits ?? {}) : [];
  const value =
    choice.source === 'team'
      ? `team:${choice.team}`
      : choice.source === 'outfit'
        ? `outfit:${choice.outfit}`
        : 'custom';
  const pick = (event) => {
    const [source, id] = event.target.value.split(':');
    onChange(
      source === 'team'
        ? { source, team: id }
        : source === 'outfit'
          ? { source, outfit: id }
          : { source: 'custom' },
    );
  };

  return node(
    'select.input',
    { id: 'outfit-source', 'aria-label': 'Outfit', onchange: pick },
    teams.length
      ? node(
          'optgroup',
          { label: 'Naga Eleven teams' },
          teams.map((id) =>
            node('option', { value: `team:${id}`, selected: value === `team:${id}` }, title(id)),
          ),
        )
      : null,
    project.outfits.length
      ? node(
          'optgroup',
          { label: 'Your outfits' },
          project.outfits.map((outfit) =>
            node(
              'option',
              { value: `outfit:${outfit.id}`, selected: value === `outfit:${outfit.id}` },
              outfit.name,
            ),
          ),
        )
      : null,
    node('option', { value: 'custom', selected: value === 'custom' }, 'Pick colours…'),
  );
}

function choiceControls(app, choice, onChange) {
  const { project } = app.store.state;
  const kits =
    choice.source === 'team'
      ? node(
          'div.segmented',
          { role: 'group', 'aria-label': 'Kit' },
          ['home', 'away', 'keeper'].map((kit) =>
            node(
              'button',
              { 'aria-pressed': String(choice.kit === kit), onclick: () => onChange({ kit }) },
              title(kit),
            ),
          ),
        )
      : null;
  const colours =
    choice.source === 'custom'
      ? project.parts.map((part) =>
          node(
            'label.group',
            { style: { gap: '4px' } },
            node('input', {
              type: 'color',
              value: choice.custom[part.id] ?? '#808080',
              'aria-label': `${part.name} colour`,
              oninput: (event) =>
                onChange({ custom: { ...choice.custom, [part.id]: event.target.value } }),
            }),
            part.name,
          ),
        )
      : null;
  const keep =
    choice.source === 'custom' && project.parts.length
      ? node(
          'button.btn',
          {
            onclick: () => {
              const outfit = {
                id: newId('o'),
                name: `Outfit ${project.outfits.length + 1}`,
                bases: { ...choice.custom },
              };
              project.outfits.push(outfit);
              changeStructure(app, 'parts');
              onChange({ source: 'outfit', outfit: outfit.id });
              toast(`Kept as "${outfit.name}". Rename it in the parts list below.`);
            },
          },
          'Keep these colours as an outfit',
        )
      : null;

  return node(
    'div.group',
    { style: { gap: '8px', flexWrap: 'wrap' } },
    sourcePicker(project, choice, onChange),
    kits,
    colours,
    keep,
  );
}

function outfitNames(app, redraw) {
  const { project } = app.store.state;

  if (!project.outfits.length) {
    return null;
  }

  return node(
    'div.field',
    {},
    node('span', {}, 'Your outfits'),
    project.outfits.map((outfit) =>
      node(
        'div.group',
        { style: { gap: '6px' } },
        node('input.input', {
          value: outfit.name,
          'aria-label': 'Outfit name',
          onchange: (event) => {
            outfit.name = event.target.value.trim() || outfit.name;
            changeStructure(app, 'parts');
            redraw();
          },
        }),
        node(
          'button.btn.quiet',
          {
            'aria-label': `Remove ${outfit.name}`,
            onclick: () => {
              project.outfits = project.outfits.filter((other) => other !== outfit);
              changeStructure(app, 'parts');
              redraw();
            },
          },
          '×',
        ),
      ),
    ),
  );
}

export function openOutfitsSheet(app) {
  const { state } = app.store;
  const teams = gameOf(state.project).teamKits;
  const sheet = openSheet(teams ? 'Team kits and outfits' : 'Outfits');
  const slot = node('div', { style: { display: 'grid', gap: '14px' } });
  let partsOpen = !state.project.parts.some((part) => part.colours.length);
  const choice = {
    source: teams ? 'team' : 'custom',
    team: 'cambodia',
    kit: 'home',
    outfit: null,
    custom: {},
  };

  const draw = () => {
    if (
      choice.source === 'outfit' &&
      !state.project.outfits.some((outfit) => outfit.id === choice.outfit)
    ) {
      choice.source = 'custom';
    }

    const mapping = kitMapping(state.project.parts, chosenRamps(state.project, choice));
    const name = chosenName(state.project, choice);
    const preview = boardPreview(state, 860, { overlay: null, mapping });
    const wear = () => {
      keepVersion(app, `Before ${name}`);
      const layers = allArtLayers(state);
      commit(app, name, layers, () =>
        layers.forEach((layer) => {
          layer.sprite = applyMapping(layer.sprite, mapping);
        }),
      );
      toast(`${name} on the whole character. Undo takes it off.`);
      sheet.close();
    };

    replace(
      slot,
      choiceControls(app, choice, (patch) => {
        Object.assign(choice, patch);
        draw();
      }),
      node('div', { style: { overflowX: 'auto' } }, preview),
      Object.keys(mapping).length
        ? null
        : node('p.hint', {}, 'Nothing changes yet: tick which colours make up each part below.'),
      node(
        'details',
        {
          open: partsOpen,
          ontoggle: (event) => {
            partsOpen = event.currentTarget.open;
          },
        },
        node('summary', {}, 'Which colours are which part'),
        partsEditor(app, draw),
        outfitNames(app, draw),
      ),
      node(
        'div.sheet-actions',
        {},
        node('button.btn', { onclick: sheet.close }, 'Close'),
        node(
          'button.btn',
          { disabled: !Object.keys(mapping).length, onclick: () => keepAsSwap(app, mapping, name) },
          'Keep as a colour swap',
        ),
        node(
          'button.btn',
          {
            onclick: () =>
              downloadOutfit(state, mapping, name).catch((error) => toast(error.message)),
          },
          'Download it',
        ),
        node(
          'button.btn.primary',
          { disabled: !Object.keys(mapping).length, onclick: wear },
          'Wear it (whole character)',
        ),
      ),
    );
  };

  sheet.body.append(slot);
  draw();
}
