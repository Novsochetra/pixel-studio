import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
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

function choices(state, ask, redraw) {
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

  return node('div.group', { style: { gap: '8px', flexWrap: 'wrap' } }, views, segmented);
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
    choices(state, ask, redraw),
    node('div', { style: { overflowX: 'auto' } }, viewsToFit(shown, 860)),
    node(
      'p.hint',
      {},
      `Attach the reference sheet (${sheet.width}×${sheet.height}, ${scale}× pixels) and paste the prompt. Then bring the AI's answer back to be cleaned: ${forHands('drop it on the canvas, or use', 'use')} Image into this frame.`,
    ),
    ask.task === 'frame' ? poseField(state, ask, box) : null,
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
  const ask = {
    direction: others[0] ?? state.at.direction,
    task: isSingleView(state.project) ? 'frame' : 'view',
    pose: '',
  };
  const redraw = (patch) => {
    Object.assign(ask, patch);
    draw(slot, state, ask, { close: sheet.close, redraw });
  };

  sheet.body.append(slot);
  redraw({});
}
