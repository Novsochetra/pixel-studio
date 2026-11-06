import { localRules } from './tools/eslint-rules/index.js';

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

// ESLint's recommended rules, named here as @eslint/js is not installed with it
const recommended = Object.fromEntries(
  [
    'constructor-super',
    'for-direction',
    'getter-return',
    'no-async-promise-executor',
    'no-case-declarations',
    'no-class-assign',
    'no-compare-neg-zero',
    'no-cond-assign',
    'no-const-assign',
    'no-constant-binary-expression',
    'no-constant-condition',
    'no-control-regex',
    'no-debugger',
    'no-delete-var',
    'no-dupe-class-members',
    'no-dupe-else-if',
    'no-dupe-keys',
    'no-duplicate-case',
    'no-empty',
    'no-empty-character-class',
    'no-empty-pattern',
    'no-empty-static-block',
    'no-ex-assign',
    'no-extra-boolean-cast',
    'no-fallthrough',
    'no-func-assign',
    'no-global-assign',
    'no-import-assign',
    'no-invalid-regexp',
    'no-irregular-whitespace',
    'no-loss-of-precision',
    'no-misleading-character-class',
    'no-new-native-nonconstructor',
    'no-nonoctal-decimal-escape',
    'no-obj-calls',
    'no-octal',
    'no-prototype-builtins',
    'no-redeclare',
    'no-regex-spaces',
    'no-self-assign',
    'no-setter-return',
    'no-shadow-restricted-names',
    'no-sparse-arrays',
    'no-this-before-super',
    'no-undef',
    'no-unexpected-multiline',
    'no-unreachable',
    'no-unsafe-finally',
    'no-unsafe-negation',
    'no-unsafe-optional-chaining',
    'no-unused-labels',
    'no-unused-private-class-members',
    'no-useless-backreference',
    'no-useless-catch',
    'no-useless-escape',
    'no-with',
    'require-yield',
    'use-isnan',
    'valid-typeof',
  ].map((rule) => [rule, 'error']),
);

const shared = [
  'globalThis',
  'console',
  'setTimeout',
  'clearTimeout',
  'URL',
  'TextEncoder',
  'TextDecoder',
  'structuredClone',
  'Promise',
  'atob',
  'btoa',
  'performance',
];

const browser = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'indexedDB',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Image',
  'ImageData',
  'Blob',
  'File',
  'FileReader',
  'Worker',
  'self',
  'createImageBitmap',
  'OffscreenCanvas',
  'getComputedStyle',
  'matchMedia',
  'DataTransfer',
  'HTMLCanvasElement',
  'CSS',
  'fetch',
  'addEventListener',
  'removeEventListener',
  'postMessage',
  'innerWidth',
  'innerHeight',
  'devicePixelRatio',
  'alert',
  'confirm',
  'Node',
];

const node = ['process', 'Buffer'];
const globalsOf = (names) =>
  Object.fromEntries([...shared, ...names].map((name) => [name, 'readonly']));

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
