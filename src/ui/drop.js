import { openImport } from './import-sheet.js';
import { openBatchSheet } from './batch-sheet.js';
import { toast } from './dom.js';
import { goTo } from './actions.js';

// the frame of the grid an image was dropped on: it is cleaned into that one, which becomes the
// frame being edited
function frameUnder(target) {
  const cell = target.closest?.('.cell:not(.mirror)');
  const row = cell?.closest('.grid-row[data-direction]');

  return row
    ? {
        direction: row.dataset.direction,
        frame: [...row.querySelectorAll('.cell:not(.mirror)')].indexOf(cell),
      }
    : null;
}

// Dropping (or pasting) an image on the canvas cleans it into the view being edited; dropped on
// a frame below the canvas, into that frame.
export function bindDrop(stage, app) {
  const target = () => app.store.state.at.direction;
  const take = (file) => {
    if (!file?.type.startsWith('image/')) {
      toast('Drop an image file: PNG, WebP or JPEG.');

      return;
    }

    openImport(app, target(), file);
  };

  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
    stage.classList.add('dropping');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('dropping');
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
    const place = files.length === 1 && frameUnder(event.target);

    if (place) {
      goTo(app, { ...place, layer: null });
    }

    if (files.length > 1) {
      openBatchSheet(app, files);
    } else {
      take(event.dataTransfer.files[0]);
    }
  });
  document.addEventListener('paste', (event) => {
    const file = [...(event.clipboardData?.files ?? [])][0];

    if (file && !document.querySelector('.sheet-backdrop')) {
      take(file);
    }
  });
}
