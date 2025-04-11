module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Required for Expo Router
        require.resolve('expo-router/babel'),
      ],
    };
  };