const path = require('path');

module.exports = {
    entry: {
        'inquiry-monad.min': './src/index.ts'
    },
    output: {
        path: path.resolve(__dirname, 'bundles'),
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'InquiryMonad',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.ts']
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: /node_modules/,
                query: {
                    declaration: false
                }
            }
        ]
    }
};
