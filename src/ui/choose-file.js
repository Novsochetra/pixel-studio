import { node } from './dom.js';

// the browser's file picker, from a click: onFiles gets the chosen files, nothing on cancel
function pick({ accept, multiple }, onFiles) {
  const input = node('input', { type: 'file', accept, multiple, hidden: true });

  input.addEventListener('change', () => {
    if (input.files.length) {
      onFiles([...input.files]);
    }

    input.remove();
  });
  document.body.append(input);
  input.click();
}

export function chooseFile(onFile, accept = 'image/*') {
  pick({ accept, multiple: false }, ([file]) => onFile(file));
}

export function chooseFiles(onFiles, accept = 'image/*') {
  pick({ accept, multiple: true }, onFiles);
}
