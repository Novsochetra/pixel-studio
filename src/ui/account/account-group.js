import { actionRow, listGroup, valueRow } from '../list-group.js';
import { openClaudeCodeSheet } from './claude-code-sheet.js';
import { signOutAndLeave } from './owner.js';

// Under every project, on the studio's own server: the account they are kept in, and the way out
// of it. Only a phone's More menu had it, and a desk had no way to sign out.
export function accountGroup(app) {
  const owner = app.backend.owner;

  return owner
    ? listGroup(
        { title: 'Account', note: 'Your projects are kept in this account, on any device.' },
        valueRow('Signed in as', owner.email),
        actionRow('Claude Code', openClaudeCodeSheet, { id: 'claude-code', leads: true }),
        actionRow('Sign out', signOutAndLeave, { id: 'sign-out' }),
      )
    : null;
}
