import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { keepFocus } from '../keep-focus.js';
import { artSprite, currentAnimation, directionsInUse, referenceSprite } from '../actions.js';
import { viewsSideBySide, viewsToFit } from '../views-side-by-side.js';
import { saveFile } from '../save-file.js';
import { fileSlug } from '../file-name.js';
import { promptText } from './prompt-text.js';
import { poseField } from './prompt-pose.js';
import { canvasToBlob } from '../../io/images.js';
import { bounds } from '../../model/sprite.js';
import { drawableDirections } from '../../model/directions.js';
import { referenceOf } from '../../model/reference.js';
import { isSingleView, viewName } from '../../model/kinds.js';
import { forHands, keyNames } from '../platform-keys.js';
import { fieldRow, listGroup } from '../list-group.js';

// a character asks for another view or the next frame; anything else for the next frame or another
// of its kind in the same style
const asksFor = (project) =>
  isSingleView(project)
    ? [
        ['frame', 'The next frame'],
        ['more', 'Another in this style'],
      ]
    : [
        ['view', 'A new view'],
        ['frame', 'An animation frame'],
      ];

// What is asked for is picked at the window's top; which view, and the frame's pose, are rows
// under it, as every other window's fields are. `box` is the prompt, which a pose typed changes.
function choices(state, ask, { redraw, box }) {
  const segmented = node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Ask for' },
    asksFor(state.project).map(([id, label]) =>
      node(
        'button',
        { 'aria-pressed': String(ask.task === id), onclick: () => redraw({ task: id }) },
        label,
      ),
    ),
  );
  const views = isSingleView(state.project)
    ? null
    : node(
        'select.input',
        {
          id: 'ask-direction',
          'aria-label': 'Which view to ask for',
          onchange: (event) => redraw({ direction: event.target.value }),
        },
        drawableDirections(state.project).map((id) =>
          node(
            'option',
            { value: id, selected: id === ask.direction },
            viewName(state.project, id),
          ),
        ),
      );

  const rows = [
    views ? fieldRow('View', views) : null,
    ask.task === 'frame' ? poseField(state, ask, box) : null,
  ].filter(Boolean);

  return [segmented, rows.length ? listGroup({}, rows) : null];
}

function copyButton(box) {
  const copy = () =>
    navigator.clipboard.writeText(box.value).then(
      () => toast('Prompt copied'),
      () => {
        box.select();
        toast(keyNames('Press ⌘C to copy'));
      },
    );

  return node('button.btn', { onclick: copy }, 'Copy the prompt');
}

// the AI has to see the art: a frame not drawn in every view yet shows the first frame instead
function shownState(state) {
  const unfinished = directionsInUse(state).some(
    (direction) => !bounds(artSprite(state, direction)),
  );

  return unfinished ? { ...state, at: { ...state.at, frame: 0 } } : state;
}

function draw(slot, state, ask, { close, redraw }) {
  const scale = state.project.canvas.scale;
  const shown = shownState(state);
  const sheet = viewsSideBySide(shown, scale);
  const box = node(
    'textarea.input.mono',
    { rows: 9, id: 'prompt-text', 'aria-label': 'Prompt', readonly: true },
    promptText(state, ask.direction, ask.task, ask.pose),
  );
  const download = async () =>
    saveFile(
      `${fileSlug(state.project.name, 'project')}-reference-sheet.png`,
      await canvasToBlob(sheet),
    );

  replace(
    slot,
    choices(state, ask, { redraw, box }),
    node('div', { style: { overflowX: 'auto' } }, viewsToFit(shown, 860)),
    node(
      'p.hint',
      {},
      `Attach the sheet (${sheet.width}×${sheet.height}, ${scale}× pixels) and paste the prompt. Bring the AI's answer back with Image into this frame${forHands(', or drop it on the canvas', '')}.`,
    ),
    box,
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: close }, 'Close'),
      copyButton(box),
      node('button.btn.primary', { onclick: download }, 'Download the reference sheet'),
    ),
  );
}

// The view being edited, when it is not the one everything is matched to: the window opened
// on Side with Front in hand. What was asked last time in this project is asked again, the pose
// typed with it.
function firstAsk(app, others) {
  const { state } = app.store;
  const editing = others.includes(state.at.direction) ? state.at.direction : null;
  const last = app.promptAsked?.project === state.project.id ? app.promptAsked : {};

  return {
    task: last.task ?? (isSingleView(state.project) ? 'frame' : 'view'),
    pose: last.pose ?? '',
    direction: editing ?? last.direction ?? others[0] ?? state.at.direction,
    project: state.project.id,
  };
}

export function openChatgptSheet(app) {
  const { state } = app.store;
  const sheet = openSheet('Prompt and reference for an AI image', null, { wide: true });
  const reference = viewName(state.project, referenceOf(state.project)).toLowerCase();

  // the prompt is made of the reference view's numbers, so that view has to be drawn first
  if (!bounds(referenceSprite(state))) {
    sheet.body.append(
      node(
        'p.hint',
        {},
        `The ${reference} view, which everything is matched to, is empty. Clean or draw it first: new art is asked for at its size, with its colours.`,
      ),
      node('div.sheet-actions', {}, node('button.btn.primary', { onclick: sheet.close }, 'OK')),
    );

    return;
  }

  const slot = node('div', { style: { display: 'grid', gap: '12px' } });
  const others = Object.keys(currentAnimation(state).directions).filter(
    (other) => other !== referenceOf(state.project),
  );
  const ask = firstAsk(app, others);
  const redraw = (patch) => {
    Object.assign(ask, patch);
    app.promptAsked = { ...ask };
    keepFocus(slot, () => draw(slot, state, ask, { close: sheet.close, redraw }));
  };

  sheet.body.append(slot);
  redraw({});
}
