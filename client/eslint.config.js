import jsxA11y from 'eslint-plugin-jsx-a11y';

// Minimal flat config: ONLY accessibility rules (no unrelated reformatting).
export default [
  {
    files: ['src/**/*.{jsx,js}'],
    plugins: { 'jsx-a11y': jsxA11y },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/media-has-caption': 'off',
      // referenced by existing inline disable comments; not a real rule here
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
