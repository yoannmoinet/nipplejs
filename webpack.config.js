const path = require('path');
const debug = process.env.NODE_ENV === 'production';

module.exports = {
    context: __dirname,
    entry: './src/manager.js',
    mode: debug ? 'development' : 'production',
    output: {
        filename: 'nipplejs.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'nipplejs'
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
