import { node, replace, toast } from '../dom.js';
import { openSheet } from '../sheet.js';
import { askDelete } from '../ask-delete.js';
import { keyNames } from '../platform-keys.js';
import { listGroup, valueRow } from '../list-group.js';
import { addCommand, makeMcpKey, mcpKey, removeMcpKey } from '../../store/server-mcp-key.js';

const dateOf = (time) =>
  new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function aboutKey(key) {
  return listGroup(
    {
      title: 'Key',
      note: 'With this key, Claude Code reads and changes the projects in this account.',
    },
    valueRow('Made', key ? dateOf(key.createdAt) : 'No key yet'),
    key ? valueRow('Last used', key.lastUsedAt ? dateOf(key.lastUsedAt) : 'Not yet') : null,
  );
}

function copyButton(box) {
  const copy = () =>
    navigator.clipboard.writeText(box.value).then(
      () => toast('Command copied'),
      () => {
        box.select();
        toast(keyNames('Press ⌘C to copy'));
      },
    );

  return node('button.btn.primary', { id: 'copy-mcp-command', onclick: copy }, 'Copy');
}

// the key's secret is shown once: only its hash is kept on the server
function commandBox(secret, close) {
  const box = node(
    'textarea.input.mono',
    { rows: 5, id: 'mcp-command', 'aria-label': 'Command', readonly: true },
    addCommand(secret),
  );

  return [
    listGroup(
      {
        title: 'Add it to Claude Code',
        note: 'Run this in a terminal. The key is shown only now.',
      },
      box,
    ),
    node('div.sheet-actions', {}, node('button.btn', { onclick: close }, 'Done'), copyButton(box)),
  ];
}

// a key in use asks before it is replaced or turned off: Claude Code holding it stops reaching
// the account, and no undo gives it back
function keyActions(key, { make, remove }) {
  const actions = node('div.sheet-actions');
  const asking = (question, word, onDelete) => () =>
    askDelete(actions, { question, word, onDelete });

  actions.append(
    ...(key
      ? [
          node(
            'button.btn',
            {
              id: 'remove-mcp-key',
              onclick: asking('Claude Code stops reaching this account.', 'Turn off', remove),
            },
            'Turn off',
          ),
          node(
            'button.btn',
            {
              id: 'make-mcp-key',
              onclick: asking('The key in use stops working.', 'Make a new key', make),
            },
            'New key',
          ),
        ]
      : [node('button.btn.primary', { id: 'make-mcp-key', onclick: make }, 'Make a key')]),
  );

  return actions;
}

export function openClaudeCodeSheet() {
  const sheet = openSheet('Claude Code', null, { focusField: false });
  const slot = node('div.claude-code', { style: { display: 'grid', gap: '12px' } });
  const failed = (error) => toast(error.message);

  const draw = (key, secret = null) => {
    const make = () => makeMcpKey().then((made) => draw(made, made.secret), failed);
    const remove = () => removeMcpKey().then(() => draw(null), failed);

    replace(
      slot,
      aboutKey(key),
      ...(secret ? commandBox(secret, sheet.close) : [keyActions(key, { make, remove })]),
    );
  };

  sheet.body.append(slot);
  mcpKey().then((key) => draw(key), failed);
}
