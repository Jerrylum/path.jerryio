// See: https://stackoverflow.com/questions/74738438/add-polyfill-to-craco-issue-add-a-fallback-resolve-fallback

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, cracoConfig, pluginOptions, context: { env, paths } }) => {
    /** @type {import('webpack/types'.Configuration)} */
    const newConfig = { ...webpackConfig };

    newConfig.resolve.fallback = webpackConfig.resolve.fallback || {};
    newConfig.resolve.fallback.util = require.resolve("util");

    return newConfig;
  }
};
