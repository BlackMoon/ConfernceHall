﻿var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var helpers = require('./helpers');

module.exports = {
    context: helpers.root('./app'),
    entry: {
        'app': './index.ts',
        'theme': 'primeng/resources/themes/flick/theme.css',
        'polyfills': './polyfills.ts',
        'vendor': './vendor.ts'
    },

    resolve: {
        extensions: ['', '.ts', '.js'] // Try .ts first, otherwise map will reference .js file.
    },

    module: {
        loaders: [
            {
                test: /\.ts$/,
                loaders: ['awesome-typescript-loader', 'angular2-template-loader']
            },
            {
                test: /\.html$/,
                loader: 'html'
            },
            {
                test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)(\?.*)?$/,
                loader: 'file?name=assets/[name].[hash].[ext]'
            },
            {
                test: /\.css$/,
                loader: 'to-string!style!css'
            }
        ]
    },

    plugins: [     

      new CopyWebpackPlugin([
            { from: './images', to: './assets', ignore: 'bg.jpg' },
            { from: 'favicon.ico' }
        ]),

      new webpack.optimize.CommonsChunkPlugin({
          name: ['app', 'theme', 'vendor', 'polyfills']
      }),

      new HtmlWebpackPlugin({
          template: './index.html'
      })
    ]
};