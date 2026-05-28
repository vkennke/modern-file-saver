export type LogLevel = 'debug' | 'none';

export interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
}

const noopLogger: Logger = {
    debug: () => {
        /* noop */
    }
};

export function createLogger(level: LogLevel = 'none'): Logger {
    if (level !== 'debug') {
        return noopLogger;
    }
    return {
        debug: (message, ...args) => {
            console.log(`[modern-file-saver] ${message}`, ...args);
        }
    };
}
