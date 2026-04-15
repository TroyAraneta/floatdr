const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.useWatchman = false;
config.resetCache = true;

module.exports = config;