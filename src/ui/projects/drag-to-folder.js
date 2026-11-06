// a type of its own, so text or files dragged in from elsewhere are not taken for a project
const PROJECT = 'application/x-pixel-clean-project';

export function draggableProject(card, id) {
  card.draggable = true;
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData(PROJECT, id);
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
}

export function folderDropTarget(target, onDrop) {
  const carries = (event) => event.dataTransfer.types.includes(PROJECT);

  target.addEventListener('dragover', (event) => {
    if (carries(event)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      target.classList.add('drop-target');
    }
  });
  target.addEventListener('dragleave', () => target.classList.remove('drop-target'));
  target.addEventListener('drop', (event) => {
    target.classList.remove('drop-target');

    if (carries(event)) {
      event.preventDefault();
      onDrop(event.dataTransfer.getData(PROJECT));
    }
  });
}
