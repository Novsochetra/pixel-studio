import { node } from '../dom.js';
import { promptText } from './prompt-text.js';
import { fieldRow } from '../list-group.js';

// typing the pose changes the prompt in place, so the field keeps its focus
export function poseField(state, ask, box) {
  const onType = (event) => {
    ask.pose = event.target.value;
    box.value = promptText(state, ask.direction, ask.task, ask.pose);
  };

  return fieldRow(
    'Pose',
    node('input.input', {
      id: 'prompt-pose',
      'aria-label': 'Pose of this frame',
      value: ask.pose,
      placeholder: 'Right foot forward, knees bent',
      oninput: onType,
    }),
  );
}
