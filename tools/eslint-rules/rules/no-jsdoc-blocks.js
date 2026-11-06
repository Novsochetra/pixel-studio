const TOOL_DIRECTIVE = /^\s*(eslint|global|globals|exported|@vitest-environment)\b/;

function isBlockToRemove(comment) {
  return comment.type === 'Block' && !TOOL_DIRECTIVE.test(comment.value);
}

export const noJsdocBlocks = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow /** */ and /* */ blocks; explain a why with a short // comment',
    },
    messages: {
      noBlock: 'Use a short // comment that explains why, or remove the comment.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (isBlockToRemove(comment)) {
            context.report({ loc: comment.loc, messageId: 'noBlock' });
          }
        }
      },
    };
  },
};
