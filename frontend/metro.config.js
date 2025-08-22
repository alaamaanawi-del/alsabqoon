const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add WASM support
config.resolver.assetExts.push('wasm');

// Handle WASM modules properly
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Add resolver for WASM files
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.maxWorkers = 2;

module.exports = config;
