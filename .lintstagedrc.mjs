const config = {
  // The validator accepts one file or directory, not lint-staged's file list.
  'content/recipes/**/*.md': () => ['corepack pnpm --filter @recipes/cli build', 'node tools/cli/dist/index.js validate content/recipes'],
  '*.{ts,tsx,js,jsx,mjs}': 'eslint --fix',
};

export default config;
