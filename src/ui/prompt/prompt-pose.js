import { node } from '../dom.js';
import { promptText } from './prompt-text.js';

// typing the pose changes the prompt in place, so the field keeps its focus
export function poseField(state, ask, box) {
  const type = (event) => {
    ask.pose = event.target.value;
    box.value = promptText(state, ask.direction, ask.task, ask.pose);
  };

  return node(
    'label.field',
    { for: 'prompt-pose' },
    node('span', {}, 'Pose of this frame'),
    node('input.input', {
      id: 'prompt-pose',
      value: ask.pose,
      placeholder: 'Right foot forward, left arm forward, knees bent',
      oninput: type,
    }),
  );
}
