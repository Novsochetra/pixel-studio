const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|css)$/;
const NOT_OURS = /(?:^|\/)(?:node_modules|dist|coverage|\.claude)\//;
const COMMENT = /(?:^|[\s{])(\/\/.*|\/\*.*?(?:\*\/|$))/;
const GIT_COMMIT = /\bgit\b.*\bcommit\b/;

// A directive tells a tool what to do; it is not the explanation CLAUDE.md asks a comment to be.
const DIRECTIVE =
  /^(?:\/\/|\/\*)\s*(?:eslint|stylelint|prettier-ignore|@vitest-environment|@ts-|global\s)/;

export const isReviewed = (file) =>
  SOURCE_FILE.test(file) && !NOT_OURS.test(file) && !file.startsWith('..');

export const isCommit = (command) => GIT_COMMIT.test(command ?? '');

function commentsIn(text = '') {
  return text
    .split('\n')
    .map((line) => COMMENT.exec(line)?.[1].trim())
    .filter((comment) => comment && !DIRECTIVE.test(comment));
}

export function changesOf(toolInput, fileBefore) {
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((edit) => [edit.old_string, edit.new_string]);
  }

  if (typeof toolInput.content === 'string') {
    return [[fileBefore, toolInput.content]];
  }

  return [[toolInput.old_string, toolInput.new_string]];
}

export function addedComments(changes) {
  return changes.flatMap(([before, after]) => {
    const kept = new Set(commentsIn(before));

    return commentsIn(after).filter((comment) => !kept.has(comment));
  });
}

export function reviewRequest(subject, commentsByFile) {
  const listed = commentsByFile.flatMap(([file, comments]) => [
    `${file}:`,
    ...comments.map((comment) => `  ${comment}`),
  ]);

  return [
    `${subject} added these comments:`,
    ...listed,
    'CLAUDE.md keeps a comment only for a why the code cannot say (a workaround, a platform ' +
      'quirk, a security reason). Delete now each one above that says what the code does or ' +
      'what a name already says.',
  ].join('\n');
}
