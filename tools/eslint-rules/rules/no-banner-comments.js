const SEPARATOR_RUN = /[-=*#~_]{3,}/;

export const noBannerComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow section banner comments such as // ---- menus ----' },
    messages: {
      noBanner: 'Remove the section banner. Split the file if it needs sections.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Line' && SEPARATOR_RUN.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'noBanner' });
          }
        }
      },
    };
  },
};
