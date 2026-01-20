export default {
  // Validate recipe markdown files
  'content/recipes/**/*.md': [
    'npm run recipe validate --'
  ],
  // Lint TypeScript files
  '*.{ts,tsx}': [
    'eslint --fix'
  ]
};
