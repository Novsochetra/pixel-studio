import { node } from '../dom.js';
import { changeStructure } from '../actions.js';
import { characterColors } from '../character-colours.js';
import { partsFromColours } from '../../palette/colour-parts.js';

// An outfit recolours parts, so a project with none set up starts there: one click makes a part
// of each family of shades, to rename and adjust below. Once parts have colours, the hint says
// what is left to do.
export function outfitFirstStep(job, mapping) {
  const { app } = job;
  const { project } = app.store.state;

  if (Object.keys(mapping).length) {
    return null;
  }

  if (project.parts.some((part) => part.colours.length)) {
    return node('p.hint', {}, 'Nothing changes yet: pick colours for a part above.');
  }

  const make = () => {
    project.parts.push(...partsFromColours(characterColors(app.store.state)));
    changeStructure(app, 'parts');
    job.partsOpen = true;
    job.draw();
  };

  return node(
    'div.field',
    { role: 'note' },
    node(
      'span',
      {},
      'First, say which colours make up each part (a shirt in three reds is one part). Start from a guess:',
    ),
    node(
      'div.group',
      {},
      node('button.btn.primary', { onclick: make }, "Make parts from the art's colours"),
    ),
  );
}
