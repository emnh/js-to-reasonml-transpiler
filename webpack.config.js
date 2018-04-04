const path = require('path');

module.exports = {
  entry: {
    index: './src/index.js',
    test: './src/Test.bs.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  devServer: {
    index: 'default.html',
    contentBase: path.join(__dirname, "."),
    compress: true,
    port: 8080
  },
  plugins: []
};
