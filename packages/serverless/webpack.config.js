/**
 * Webpack configuration for Lambda function optimization
 * Reduces package size and improves cold start performance
 */

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    'handlers/session-creator': './src/handlers/session-creator.ts',
    'handlers/warmer': './src/handlers/warmer.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Exclude AWS SDK (available in Lambda runtime)
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    '@aws-sdk/client-secrets-manager': '@aws-sdk/client-secrets-manager',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // Keep console logs for CloudWatch
            dead_code: true,
            unused: true,
          },
          mangle: true,
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    // Split chunks for shared code
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000,
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
  },
};
