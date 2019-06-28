// const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

const DEBUG = process.env.NODE_ENV !== 'production';
const NAME = 'nipplejs';

module.exports = {
    context: __dirname,
    entry: './src/index.js',
    mode: DEBUG ? 'development' : 'production',
    devServer: {
        contentBase: __dirname,
        publicPath: '/dist/',
        port: 9000,
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: `${NAME}.js`,
        library: NAME,
        libraryExport: 'default',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    'babel-loader',
                    'eslint-loader'
                ]
            },
            {
                test: /\.(sass|scss)$/,
                use: [{
                    loader: 'css-loader',
                    options: {
                        modules: false,
                        localIdentName: '[name]__[local]--[hash:base64:5]' // name是样式文件名
                    }
                }, {
                    loader: 'sass-loader'
                }],
                exclude: /node_modules/,
                include: path.resolve(__dirname, './src/')
            },
            {
                test: /\.css$/,
                use: [{
                    loader: 'style-loader'
                }, {
                    loader: 'css-loader'
                }]
            }, {
                test: /\.(png|jpg)$/,
                use: [{
                    loader: 'url-loader?limit=8192'
                }]
            }
        ]
    }
};
