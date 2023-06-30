// See: https://stackoverflow.com/questions/53955660/workbox-webpack-4-plugin-unable-to-precache-non-webpack-assets

const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, cracoConfig, pluginOptions, context: { env, paths } }) => {
    /** @type {import('webpack/types'.Configuration)} */
    const newConfig = { ...webpackConfig };

    newConfig.plugins.push(
      new CopyPlugin({
        patterns: [
          { from: "*.png", context: "public", noErrorOnMissing: true },
          { from: "*.jpg", context: "public", noErrorOnMissing: true },
          { from: "*.jpeg", context: "public", noErrorOnMissing: true },
          { from: "*.svg", context: "public", noErrorOnMissing: true },
          { from: "*.gif", context: "public", noErrorOnMissing: true },
          { from: "*.ico", context: "public", noErrorOnMissing: true }
        ]
      })
    );
    return newConfig;
  }
};
