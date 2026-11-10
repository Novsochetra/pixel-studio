import { node } from './dom.js';
import { openSheet } from './sheet.js';

function sayChanged(name) {
  const sheet = openSheet('Changed in another tab', null, { focusField: false });

  sheet.body.append(
    node(
      'p.hint',
      {},
      `${name} was just saved from another tab or window. This one still shows it as it was, and what you change here is saved over that work.`,
    ),
    node(
      'div.sheet-actions',
      {},
      node('button.btn', { onclick: sheet.close }, 'Keep editing here'),
      node('button.btn.primary', { onclick: () => location.reload() }, 'Load the latest'),
    ),
  );
}

// Two tabs on one project each save over the other, and neither shows the other's work. The tab
// that hears the other save says so, once for each project it has open.
export function watchOtherTabs(app) {
  if (!globalThis.BroadcastChannel) {
    return { saved() {} };
  }

  const channel = new globalThis.BroadcastChannel('pixel-clean-studio');
  const told = new Set();

  channel.onmessage = ({ data }) => {
    const { project } = app.store.state;

    if (data?.saved === project.id && !told.has(project.id)) {
      told.add(project.id);
      sayChanged(project.name);
    }
  };

  return { saved: (id) => channel.postMessage({ saved: id }) };
}
