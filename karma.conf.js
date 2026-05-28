/**
 * Karma is in maintenance mode upstream. For a future migration consider
 * @web/test-runner or Vitest browser-mode. For now we keep Karma + webpack
 * because both Chrome and Firefox runners work reliably.
 */
module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'webpack'],
        files: [{ pattern: 'test/**/*.spec.ts', type: 'module' }],
        preprocessors: {
            'test/**/*.spec.ts': ['webpack']
        },
        webpack: {
            mode: 'development',
            devtool: 'inline-source-map',
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        use: {
                            loader: 'ts-loader',
                            options: {
                                configFile: 'tsconfig.test.json',
                                transpileOnly: true
                            }
                        },
                        exclude: /node_modules/
                    }
                ]
            },
            resolve: {
                extensions: ['.ts', '.js']
            },
            stats: 'errors-only'
        },
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['ChromeHeadless', 'FirefoxHeadless'],
        singleRun: false,
        concurrency: Infinity
    });
};
