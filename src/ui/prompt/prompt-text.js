import { currentAnimation, referenceSprite } from '../actions.js';
import { characterColors } from '../character-colours.js';
import { promptText as writePrompt } from '../../export/prompt.js';

export function promptText(state, direction, task, pose = '') {
  return writePrompt(state.project, {
    animation: currentAnimation(state).name,
    direction,
    task,
    pose,
    reference: referenceSprite(state),
    colours: characterColors(state),
  });
}
