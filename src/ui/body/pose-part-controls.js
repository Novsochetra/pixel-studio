import { icon, node } from '../dom.js';
import { partPose } from '../../model/body/rig.js';
import { tidyAngle } from '../../model/body/handle.js';
import { drawOn, onBody, setPart } from './pose-actions.js';

const STEP = 15;

const button = (label, onclick, title = label) =>
  node('button.btn.quiet', { onclick, title }, label);

export function partPicker(app, rig, picked) {
  const pick = (event) => app.store.set({ piece: event.target.value || null, at: onBody(app) });

  return node(
    'select.input',
    { id: 'pose-part', 'aria-label': 'Part to pose', onchange: pick },
    node('option', { value: '', selected: !picked }, 'Pick a part'),
    [...rig.pieces]
      .reverse()
      .map((piece) => node('option', { value: piece.id, selected: piece === picked }, piece.name)),
  );
}

export function angleControls(app, piece, pose) {
  const angle = partPose(pose, piece.id).angle;
  const turnTo = (value) => setPart(app, piece, { angle: tidyAngle(value) });

  return [
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Turn ${piece.name} ${STEP}° left`, onclick: () => turnTo(angle - STEP) },
      icon('turn-left'),
    ),
    node(
      'label.pose-angle',
      { title: 'How far the part is turned, in degrees' },
      node('input.input.mono', {
        id: 'pose-angle',
        'aria-label': `Angle of ${piece.name}`,
        type: 'number',
        step: '1',
        value: String(angle),
        onchange: (event) => turnTo(Number(event.target.value) || 0),
      }),
      '°',
    ),
    node(
      'button.btn.quiet.icon-only',
      { 'aria-label': `Turn ${piece.name} ${STEP}° right`, onclick: () => turnTo(angle + STEP) },
      icon('turn-right'),
    ),
  ];
}

export const drawOnPart = (app, piece) =>
  button(
    'Draw on part',
    () => drawOn(app),
    `Draw what is missing on ${piece.name}: it stays on the part, in every frame`,
  );

export const resetPart = (app, piece) =>
  button('Reset part', () => setPart(app, piece, null), `${piece.name} back as it was cut`);
