export type LogLevel = 'debug' | 'warn' | 'none';

export interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
}

const noop = (): void => {
    /* noop */
};

const noopLogger: Logger = {
    debug: noop,
    warn: noop
};

const consoleDebug: Logger['debug'] = (message, ...args) =>
    console.log(`[modern-file-saver] ${message}`, ...args);

const consoleWarn: Logger['warn'] = (message, ...args) =>
    console.warn(`[modern-file-saver] ${message}`, ...args);

export function createLogger(level: LogLevel = 'none'): Logger {
    if (level === 'none') {
        return noopLogger;
    }
    // 'warn' enables warn only; 'debug' enables both.
    return {
        debug: level === 'debug' ? consoleDebug : noop,
        warn: consoleWarn
    };
}
