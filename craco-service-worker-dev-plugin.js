// See: https://stackoverflow.com/questions/65063966/how-to-use-the-service-worker-in-dev-mode-with-create-react-app
// See: https://developer.chrome.com/docs/workbox/reference/workbox-webpack-plugin/#type-InjectManifest
// See: https://github.com/facebook/create-react-app/issues/11060

const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const path = require("path");

module.exports = {
  overrideWebpackConfig: ({ webpackConfig, cracoConfig, pluginOptions, context: { env, paths } }) => {
    /** @type {import('webpack/types'.Configuration)} */
    const newConfig = { ...webpackConfig };

    if (env === "development") {
      newConfig.plugins.push(
        new WorkboxWebpackPlugin.InjectManifest({
          swSrc: path.resolve(__dirname, "src/service-worker.ts"),
          dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
          exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024
        })
      );
    }
    return newConfig;
  }
};
