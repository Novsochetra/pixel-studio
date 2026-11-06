const HEX_COLOR = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;

function reportIfHex(context, node, text) {
  if (typeof text === 'string' && HEX_COLOR.test(text)) {
    context.report({ node, messageId: 'noHex' });
  }
}

export const noRawHex = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw hex colors outside the design tokens and art palettes' },
    messages: {
      noHex: 'Use a color from the design tokens or the art palette instead of a raw hex value.',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        reportIfHex(context, node, node.value);
      },
      TemplateElement(node) {
        reportIfHex(context, node, node.value.cooked);
      },
    };
  },
};
