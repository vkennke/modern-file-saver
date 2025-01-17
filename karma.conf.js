module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'webpack'],
        files: [
            { pattern: 'test/**/*.spec.ts', type: 'module' }
        ],
        preprocessors: {
            'test/**/*.spec.ts': ['webpack']
        },
        webpack: {
            mode: 'development',
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        use: 'ts-loader',
                        exclude: /node_modules/
                    }
                ]
            },
            resolve: {
                extensions: ['.ts', '.js']
            }
        },
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome', 'Firefox'],
        singleRun: false,
        concurrency: Infinity
    });
};