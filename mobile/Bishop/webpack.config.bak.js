const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve.fallback = {
    ...config.resolve.fallback,
    module: false,
    fs: false,
    path: require.resolve('path-browserify'),
    crypto: require.resolve('crypto-browserify'),
    os: require.resolve('os-browserify/browser'),
    stream: require.resolve('stream-browserify'),
    url: require.resolve('url/'),
    process: require.resolve('process/browser'),
    v8: false,
    worker_threads: false
  };

  return config;
};
