const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: {
      tool_page: './src/js/tool-page.js',
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
          { from: 'public', to: '.' }, 
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
