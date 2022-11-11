const Webpack = require('webpack');
const { merge } = require('webpack-merge');
const BasicWebpackConfig = require('./webpack.config.basic.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(BasicWebpackConfig, {
  devtool: false,
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    new Webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new Webpack.optimize.ModuleConcatenationPlugin(),
  ],
});
