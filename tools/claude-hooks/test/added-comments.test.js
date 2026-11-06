import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  addedComments,
  changesOf,
  isCommit,
  isReviewed,
  reviewRequest,
} from '../added-comments.js';

describe('isReviewed', () => {
  it('reviews the project’s scripts and styles', () => {
    for (const file of ['src/a.js', 'test/b.mjs', 'tools/c.cjs', 'src/ui/styles/d.css']) {
      assert.equal(isReviewed(file), true, file);
    }
  });

  it('leaves out other files, packages, builds and files outside the project', () => {
    for (const file of ['CLAUDE.md', 'node_modules/x/a.js', 'dist/a.js', '../a.js', 'a.json']) {
      assert.equal(isReviewed(file), false, file);
    }
  });
});

describe('addedComments', () => {
  it('finds line, trailing and block comments', () => {
    const after = '// a\nconst x = 1; // b\n/* c */';

    assert.deepEqual(addedComments([['', after]]), ['// a', '// b', '/* c */']);
  });

  it('skips the comments the edit only kept', () => {
    const before = '// kept\nconst x = 1;';

    assert.deepEqual(addedComments([[before, '// kept\n// new\nconst x = 2;']]), ['// new']);
  });

  it('skips tool directives, which explain nothing', () => {
    const after = [
      '// eslint-disable-next-line no-console',
      '/* stylelint-disable */',
      '// prettier-ignore',
    ].join('\n');

    assert.deepEqual(addedComments([['', after]]), []);
  });

  it('takes no address or glob in a string for a comment', () => {
    const after = "const url = 'https://claude.ai/a.png';\nconst glob = 'src/**/*.js';";

    assert.deepEqual(addedComments([['', after]]), []);
  });
});

describe('changesOf', () => {
  it('reads an Edit, a MultiEdit and a Write', () => {
    const edits = [{ old_string: 'a', new_string: 'b' }];

    assert.deepEqual(changesOf({ old_string: 'a', new_string: 'b' }, ''), [['a', 'b']]);
    assert.deepEqual(changesOf({ edits }, ''), [['a', 'b']]);
    assert.deepEqual(changesOf({ content: 'new' }, 'old'), [['old', 'new']]);
  });
});

describe('isCommit', () => {
  it('knows a command that commits', () => {
    assert.equal(isCommit('git add -A && git commit -q -F - <<EOF'), true);
    assert.equal(isCommit('git -c user.name=x commit -m "a"'), true);
  });

  it('knows a command that does not', () => {
    assert.equal(isCommit('git status --short'), false);
    assert.equal(isCommit(undefined), false);
  });
});

describe('reviewRequest', () => {
  it('names each file and its comments, and asks for the what-comments to go', () => {
    const request = reviewRequest('This edit', [
      ['src/a.js', ['// sets the card']],
      ['src/ui/styles/b.css', ['/* the sheet */']],
    ]);

    assert.match(request, /^This edit added these comments:\nsrc\/a\.js:\n {2}\/\/ sets the card/);
    assert.ok(request.includes('src/ui/styles/b.css:\n  /* the sheet */'));
    assert.match(request, /Delete now each one above that says what the code does/);
  });
});
