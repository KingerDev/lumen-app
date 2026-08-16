module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    // Must stay last — it rewrites worklet functions for Reanimated.
    plugins: ['react-native-worklets/plugin'],
  };
};
