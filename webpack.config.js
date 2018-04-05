const path = require('path');

var serverConfig = {
  target: 'node',
  entry: {
    node: './src/node.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.txt$/,
        use: 'raw-loader'
      }
    ]
  }
};

var clientConfig = {
  target: 'web',
  entry: {
    index: './src/index.js',
    test: './src/Test.bs.js',
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
  plugins: [],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.txt$/,
        use: 'raw-loader'
      }
    ]
  }
};

module.exports = [ serverConfig, clientConfig ];
