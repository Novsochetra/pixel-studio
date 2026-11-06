import { localRules } from './tools/eslint-rules/index.js';
import { recommended } from './tools/eslint-rules/recommended.js';
import { browser, globalsOf, node } from './tools/eslint-rules/globals.js';

// The fighting-games rules (its eslint.config.js), kept free of plugins so linting needs only ESLint.

const sizeAndComplexity = {
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-nested-callbacks': ['error', 3],
  'max-lines': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
  'max-classes-per-file': ['error', 1],
};

const readability = {
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always'],
  'id-length': ['error', { min: 2, properties: 'never', exceptions: ['x', 'y', 'i', 'j', '_'] }],
  'no-nested-ternary': 'error',
  'no-param-reassign': ['error', { props: false }],
  'no-shadow': 'error',
  'no-var': 'error',
  'no-else-return': 'error',
  'object-shorthand': 'error',
  'prefer-const': 'error',
  'prefer-template': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

const comments = {
  'no-warning-comments': [
    'error',
    { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'anywhere' },
  ],
  'local/no-jsdoc-blocks': 'error',
  'local/no-banner-comments': 'error',
};

export default [
  { ignores: ['node_modules/', 'dist/', 'shots/', 'fixtures/', 'assets/'] },
  {
    plugins: { local: localRules },
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globalsOf(node) },
    rules: { ...recommended, ...sizeAndComplexity, ...readability, ...comments },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globalsOf(browser) },
    rules: { 'local/no-raw-hex': 'error' },
  },
  // colours painted on the canvas are pixel-art data and live only in the art palettes
  {
    files: ['src/art/**/*.js'],
    rules: { 'local/no-raw-hex': 'off' },
  },
  {
    files: ['test/**/*.{js,mjs}'],
    languageOptions: { globals: globalsOf([...node, ...browser]) },
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 4],
    },
  },
];
