module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin powers reanimated 4 worklets and MUST be last in
    // the plugins array (renamed from react-native-reanimated/plugin in reanimated 3→4).
    plugins: ['react-native-worklets/plugin'],
  };
};
