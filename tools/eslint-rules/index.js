import { noBannerComments } from './rules/no-banner-comments.js';
import { noJsdocBlocks } from './rules/no-jsdoc-blocks.js';
import { noRawHex } from './rules/no-raw-hex.js';

export const localRules = {
  meta: { name: 'local' },
  rules: {
    'no-banner-comments': noBannerComments,
    'no-jsdoc-blocks': noJsdocBlocks,
    'no-raw-hex': noRawHex,
  },
};
