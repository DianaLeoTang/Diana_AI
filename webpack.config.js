const path = require('path');
// const TerserPlugin = require('terser-webpack-plugin');
const layerDependencies = [
  '@koa/cors',
  '@koa/router',
  '@langchain/community',
  '@langchain/core',
  '@langchain/openai',
  'bignumber.js',
  'dotenv',
  'koa',
  'koa-bodyparser',
  'koa-static',
  'langchain',
  'serverless-http',
];
module.exports = {
  entry: {
    lambda: './src/lambda.ts',
  },
  target: 'node',
  mode: 'development',
  externals: [
    ({ request }, callback) => {
      if (layerDependencies.includes(request)) {
        return callback(null, `commonjs ${request}`);
      }
      if (request === 'express') {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [
          /node_modules/,
          /\.spec\.ts$/,
          /\.e2e-spec\.ts$/,
          path.resolve(__dirname, 'test'),
          path.resolve(__dirname, 'src/**/*.spec.ts'),
        ],
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (pathData) => {
      // 入口文件固定命名
      return pathData.chunk.name === 'lambda' ? 'lambda.js' : '[name].js';
    },
    chunkFilename: '[name].[contenthash].js',
    clean: true,
    libraryTarget: 'commonjs2',
  },
  optimization: {
    minimize: false,
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      cacheGroups: {
        default: false,
        vendors: false,
        sources: {
          test: /\.ts$/,
          name(module) {
            if (module.resource.endsWith('lambda.ts')) {
              return false;
            }
            const srcPath = path.relative(
              path.join(__dirname, 'src'),
              module.resource
            );
            return srcPath.replace(/\.ts$/, ''); // 只替换 .ts 后缀为空
          },
          chunks: 'all',
          enforce: true,
          priority: 10,
        },
      },
    },
  },
  stats: {
    errorDetails: true,
    chunks: true,
    modules: true,
  },
  devtool: 'source-map',
};
