import { h, replace, toast } from './dom.js';
import { openSheet } from './sheet.js';
import { allArtLayers, changeStructure, commit } from './actions.js';
import { boardPreview } from './board-canvas.js';
import { partsEditor } from './parts-editor.js';
import { kitMapping, outfitRamps } from '../palette/kits.js';
import { applyMapping } from '../palette/palette.js';
import { newId } from '../model/project.js';
import { profileOf } from '../model/profiles.js';
import { keepVersion } from './versions-sheet.js';
import { downloadOutfit, keepAsSwap } from './outfit-files.js';

const title = (id) => id.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
// the ramps the current choice gives each part: a Naga Eleven team, a saved outfit, or colours
function chosenRamps(project, choice) {
  if (choice.source === 'team') {
    return globalThis.GAME_KITS?.kits?.[choice.team]?.[choice.kit] ?? {};
  }

  if (choice.source === 'outfit') {
    return outfitRamps(project.parts, project.outfits.find((o) => o.id === choice.outfit)?.bases ?? {});
  }

  return outfitRamps(project.parts, choice.custom);
}

function chosenName(project, choice) {
  if (choice.source === 'team') {
    return `${title(choice.team)} ${choice.kit}`;
  }

  return choice.source === 'outfit' ? (project.outfits.find((o) => o.id === choice.outfit)?.name ?? 'Outfit') : 'Custom colours';
}

function sourcePicker(project, choice, onChange) {
  const teams = profileOf(project).teamKits ? Object.keys(globalThis.GAME_KITS?.kits ?? {}) : [];
  const value = choice.source === 'team' ? `team:${choice.team}` : choice.source === 'outfit' ? `outfit:${choice.outfit}` : 'custom';
  const pick = (event) => {
    const [source, id] = event.target.value.split(':');
    onChange(source === 'team' ? { source, team: id } : source === 'outfit' ? { source, outfit: id } : { source: 'custom' });
  };

  return h('select.input', { id: 'outfit-source', 'aria-label': 'Outfit', onchange: pick },
    teams.length ? h('optgroup', { label: 'Naga Eleven teams' }, teams.map((id) => h('option', { value: `team:${id}`, selected: value === `team:${id}` }, title(id)))) : null,
    project.outfits.length ? h('optgroup', { label: 'Your outfits' }, project.outfits.map((o) => h('option', { value: `outfit:${o.id}`, selected: value === `outfit:${o.id}` }, o.name))) : null,
    h('option', { value: 'custom', selected: value === 'custom' }, 'Pick colours…'));
}

function choiceControls(app, choice, onChange) {
  const { project } = app.store.state;
  const kits = choice.source === 'team'
    ? h('div.segmented', { role: 'group', 'aria-label': 'Kit' }, ['home', 'away', 'keeper'].map((k) => h('button', { 'aria-pressed': String(choice.kit === k), onclick: () => onChange({ kit: k }) }, title(k))))
    : null;
  const colours = choice.source === 'custom'
    ? project.parts.map((part) => h('label.group', { style: { gap: '4px' } }, h('input', { type: 'color', value: choice.custom[part.id] ?? '#808080', 'aria-label': `${part.name} colour`, oninput: (event) => onChange({ custom: { ...choice.custom, [part.id]: event.target.value } }) }), part.name))
    : null;
  const keep = choice.source === 'custom' && project.parts.length
    ? h('button.btn', { onclick: () => {
        const outfit = { id: newId('o'), name: `Outfit ${project.outfits.length + 1}`, bases: { ...choice.custom } };
        project.outfits.push(outfit);
        changeStructure(app, 'parts');
        onChange({ source: 'outfit', outfit: outfit.id });
        toast(`Kept as "${outfit.name}". Rename it in the parts list below.`);
      } }, 'Keep these colours as an outfit')
    : null;

  return h('div.group', { style: { gap: '8px', flexWrap: 'wrap' } }, sourcePicker(project, choice, onChange), kits, colours, keep);
}

function outfitNames(app, redraw) {
  const { project } = app.store.state;

  if (!project.outfits.length) {
    return null;
  }

  return h('div.field', {}, h('span', {}, 'Your outfits'), project.outfits.map((outfit) =>
    h('div.group', { style: { gap: '6px' } },
      h('input.input', { value: outfit.name, 'aria-label': 'Outfit name', onchange: (event) => { outfit.name = event.target.value.trim() || outfit.name; changeStructure(app, 'parts'); redraw(); } }),
      h('button.btn.quiet', { 'aria-label': `Remove ${outfit.name}`, onclick: () => { project.outfits = project.outfits.filter((o) => o !== outfit); changeStructure(app, 'parts'); redraw(); } }, '×'))));
}

export function openOutfitsSheet(app) {
  const { state } = app.store;
  const teams = profileOf(state.project).teamKits;
  const sheet = openSheet(teams ? 'Team kits and outfits' : 'Outfits');
  const slot = h('div', { style: { display: 'grid', gap: '14px' } });
  let partsOpen = !state.project.parts.some((part) => part.colours.length);
  const choice = { source: teams ? 'team' : 'custom', team: 'cambodia', kit: 'home', outfit: null, custom: {} };

  const draw = () => {
    if (choice.source === 'outfit' && !state.project.outfits.some((o) => o.id === choice.outfit)) {
      choice.source = 'custom';
    }

    const mapping = kitMapping(state.project.parts, chosenRamps(state.project, choice));
    const name = chosenName(state.project, choice);
    const preview = boardPreview(state, 860, { overlay: null, mapping });
    const wear = () => {
      keepVersion(app, `Before ${name}`);
      const layers = allArtLayers(state);
      commit(app, name, layers, () => layers.forEach((layer) => { layer.sprite = applyMapping(layer.sprite, mapping); }));
      toast(`${name} on the whole character. Undo takes it off.`);
      sheet.close();
    };

    replace(
      slot,
      choiceControls(app, choice, (patch) => { Object.assign(choice, patch); draw(); }),
      h('div', { style: { overflowX: 'auto' } }, preview),
      Object.keys(mapping).length ? null : h('p.hint', {}, 'Nothing changes yet: tick which colours make up each part below.'),
      h('details', { open: partsOpen, ontoggle: (event) => { partsOpen = event.currentTarget.open; } }, h('summary', {}, 'Which colours are which part'), partsEditor(app, draw), outfitNames(app, draw)),
      h('div.sheet-actions', {},
        h('button.btn', { onclick: sheet.close }, 'Close'),
        h('button.btn', { disabled: !Object.keys(mapping).length, onclick: () => keepAsSwap(app, mapping, name) }, 'Keep as a colour swap'),
        h('button.btn', { onclick: () => downloadOutfit(state, mapping, name).catch((e) => toast(e.message)) }, 'Download it'),
        h('button.btn.primary', { disabled: !Object.keys(mapping).length, onclick: wear }, 'Wear it (whole character)')),
    );
  };

  sheet.body.append(slot);
  draw();
}
