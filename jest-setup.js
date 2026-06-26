// Jest setup for reanimated 4 + gesture-handler under the jest-expo preset.
// jest-expo does not register these mocks itself, so component tests that import
// reanimated/gesture-handler need them here or they fail on setup (a false regression).
require('react-native-reanimated').setUpTests();
require('react-native-gesture-handler/jestSetup');
