const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@react-native-community']
    }
  }, argv);

  // Customize the config before returning it.
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    '@react-native-community/netinfo': 'react-native-web/dist/exports/NetInfo',
  };

  // Disable React DevTools integration
  config.plugins = config.plugins.filter(plugin => 
    !plugin.constructor.name.includes('ReactDevToolsPlugin')
  );

  return config;
}; 