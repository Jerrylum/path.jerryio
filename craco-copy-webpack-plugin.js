// See: https://stackoverflow.com/questions/53955660/workbox-webpack-4-plugin-unable-to-precache-non-webpack-assets

const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, cracoConfig, pluginOptions, context: { env, paths } }) => {
    /** @type {import('webpack/types'.Configuration)} */
    const newConfig = { ...webpackConfig };

    // The "precache" directory is where we require the service worker to precache files.
    // Files in other directories like "static" doesn't mean they are NOT precached.
    newConfig.plugins.push(
      new CopyPlugin({
        patterns: [
          { from: "precache/*.*", context: "public", noErrorOnMissing: true }
        ]
      })
    );
    return newConfig;
  }
};
