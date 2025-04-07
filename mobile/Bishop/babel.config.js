module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // no need for the 'expo-router/babel' plugin anymore
  };
};
