import { strict as assert } from 'node:assert';
import { afterEach, describe, it } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const script = path.join(root, 'tools/claude-hooks/review-comments.js');
const sourceFile = path.join(root, 'src/ui/dom.js');
const scratchRepos = [];
// run from a commit's pre-commit check, git has set GIT_INDEX_FILE and the like for the commit's own
// repository, and git in a scratch repository would follow them there
const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
);

function runHook(payload, projectDir = root) {
  const run = spawnSync('node', [script], {
    input: JSON.stringify(payload),
    env: { ...env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  });

  return { status: run.status, output: run.stdout };
}

const contextOf = ({ output }) => JSON.parse(output).hookSpecificOutput.additionalContext;

function commitIn(repo, file, text) {
  writeFileSync(path.join(repo, file), text);
  execFileSync('git', ['add', file], { cwd: repo, env });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'change'], {
    cwd: repo,
    env,
  });
}

function scratchRepo() {
  const repo = mkdtempSync(path.join(tmpdir(), 'comment-review-'));

  scratchRepos.push(repo);
  execFileSync('git', ['init', '-q'], { cwd: repo, env });
  commitIn(repo, 'a.js', '// kept\nconst a = 1;\n');

  return repo;
}

const commitRun = (repo) =>
  runHook({ tool_name: 'Bash', tool_input: { command: 'git commit -qm change' } }, repo);

afterEach(() => {
  scratchRepos.splice(0).forEach((repo) => rmSync(repo, { recursive: true, force: true }));
});

describe('the comment review hook, after an edit', () => {
  it('hands Claude the comments the edit added', () => {
    const edit = { file_path: sourceFile, old_string: '', new_string: '// x' };
    const run = runHook({ tool_name: 'Edit', tool_input: edit });
    const { hookSpecificOutput } = JSON.parse(run.output);

    assert.equal(run.status, 0);
    assert.equal(hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.ok(hookSpecificOutput.additionalContext.includes('src/ui/dom.js:\n  // x'));
  });

  it('says nothing about an edit that added no comment, or a file it does not review', () => {
    const plain = { file_path: sourceFile, old_string: 'a', new_string: 'b' };
    const notes = { file_path: path.join(root, 'CLAUDE.md'), old_string: '', new_string: '// x' };

    assert.deepEqual(runHook({ tool_name: 'Edit', tool_input: plain }), { status: 0, output: '' });
    assert.equal(runHook({ tool_name: 'Edit', tool_input: notes }).output, '');
  });
});

describe('the comment review hook, after a commit', () => {
  it('hands Claude the comments the commit added, however the files were edited', () => {
    const repo = scratchRepo();

    commitIn(repo, 'a.js', '// kept\n// sets a\nconst a = 2;\n');

    assert.match(
      contextOf(commitRun(repo)),
      /^Commit [0-9a-f]{7,} added these comments:\na\.js:\n {2}\/\/ sets a\n/,
    );
  });

  it('says nothing when the commit failed, leaving HEAD where it moved minutes ago', () => {
    const repo = scratchRepo();
    const minutesAgo = new Date(Date.now() - 5 * 60_000);

    commitIn(repo, 'a.js', '// kept\n// sets a\nconst a = 2;\n');
    utimesSync(path.join(repo, '.git/logs/HEAD'), minutesAgo, minutesAgo);

    assert.deepEqual(commitRun(repo), { status: 0, output: '' });
  });

  it('says nothing after a command that commits nothing', () => {
    const run = runHook({ tool_name: 'Bash', tool_input: { command: 'git status' } });

    assert.deepEqual(run, { status: 0, output: '' });
  });
});
