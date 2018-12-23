const path = require('path');

const DEBUG = process.env.NODE_ENV !== 'production';
const NAME = 'nipplejs';

module.exports = {
    context: __dirname,
    entry: './src/index.js',
    mode: DEBUG ? 'development' : 'production',
    devServer:{
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
        ]
    }
};
