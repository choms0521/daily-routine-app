/**
 * Jest configuration for the domain core (Stage 1) and later UI/component tests.
 *
 * Uses the jest-expo preset so React Native modules (e.g. AsyncStorage) resolve
 * the same way they do at runtime. Domain functions are pure, so they run under
 * this preset without extra setup.
 */
module.exports = {
  preset: 'jest-expo',
  // Only *.test.ts(x) are test suites; shared fixtures/helpers under __tests__ are not.
  // .tsx is included for component (RNTL) tests from Stage 2 onward.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/repository/**/*.ts',
    'src/types/**/*.ts',
    'src/store/**/*.ts',
    'src/components/**/*.tsx',
    'src/theme/**/*.{ts,tsx}',
  ],
};
