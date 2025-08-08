const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: {
      extension_page: './src/js/extension-page.js',
      oauth_helper: './src/js/oauth-helper.js',
      content: './src/contentscript/content.js',
      background: './src/js/background.js'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
    },
    devtool: isDev ? 'inline-source-map' : false,
    mode: isDev ? 'development' : 'production',


    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'public', to: '.' }, // Copy HTML, manifest, icons, etc.
        ],
      }),
    ],

    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
  };
};
