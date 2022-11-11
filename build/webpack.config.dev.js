const path = require('path');
const Webpack = require('webpack');
const { merge } = require('webpack-merge');
const BasicWebpackConfig = require('./webpack.config.basic.js');

module.exports = merge(BasicWebpackConfig, {
  devtool: 'source-map',
  mode: 'development',
  output: {
    publicPath: '/',
  },
  devServer: {
    port: 9999,
    host: '0.0.0.0',
    static: {
      directory: path.resolve(__dirname, 'dist'),
    },
  },
  plugins: [
    new Webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"development"',
      },
    }),
    new Webpack.HotModuleReplacementPlugin(),
  ],
});
