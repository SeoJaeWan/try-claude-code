/**
 * lint-staged configuration
 *
 * Runs ESLint on staged TypeScript/JavaScript files during pre-commit hook.
 * Works with husky pre-commit hook to enforce coding-rules automatically.
 */
export default {
  "*.{ts,tsx,js,jsx,mjs}": ["eslint --fix"],
  "*.{json,md,css,scss}": ["prettier --write"],
};
