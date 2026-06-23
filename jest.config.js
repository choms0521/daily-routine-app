/**
 * Jest configuration for the domain core (Stage 1) and later UI/component tests.
 *
 * Uses the jest-expo preset so React Native modules (e.g. AsyncStorage) resolve
 * the same way they do at runtime. Domain functions are pure, so they run under
 * this preset without extra setup.
 */
module.exports = {
  preset: 'jest-expo',
  // Only *.test.ts are test suites; shared fixtures/helpers under __tests__ are not.
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/repository/**/*.ts',
    'src/types/**/*.ts',
  ],
};
