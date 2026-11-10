import { node } from './dom.js';

// What undo cannot bring back (a folder, a version, a preset, a project) asks before it goes, the
// same way everywhere: where the thing stood, a question with the word that does it and Keep.
// Keep, or Esc, puts back what was there.
export function askDelete(place, { question, word = 'Delete', onDelete }) {
  const was = [...place.childNodes];
  const keep = () => {
    place.classList.remove('asking');
    place.replaceChildren(...was);
    place.querySelector('button')?.focus();
  };

  place.classList.add('asking');
  place.replaceChildren(
    node('span.ask-question', {}, question),
    node(
      'span.ask-answers',
      {},
      node('button.btn.danger', { onclick: onDelete }, word),
      node('button.btn', { onclick: keep }, 'Keep'),
    ),
  );
  place.onkeydown = (event) => {
    // Esc answers the question: it does not go on to close the window the question is in
    if (event.key === 'Escape' && place.classList.contains('asking')) {
      event.stopPropagation();
      keep();
    }
  };
  place.querySelector('.btn:not(.danger)').focus();
}
