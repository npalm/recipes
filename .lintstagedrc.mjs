export default {
  // The validator accepts one file or directory, not lint-staged's file list.
  'content/recipes/**/*.md': () => 'node tools/cli/dist/index.js validate content/recipes',
  '*.{ts,tsx,js,jsx,mjs}': 'eslint --fix',
};
