export type LogLevel = 'debug' | 'none';

export interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
}

export class ConsoleLogger implements Logger {
    constructor(private level: LogLevel = 'none') {}

    debug(message: string, ...args: unknown[]): void {
        if (this.level === 'debug') {
            console.log(`[modern-file-saver] ${message}`, ...args);
        }
    }
}

export function createLogger(level: LogLevel = 'none'): Logger {
    return new ConsoleLogger(level);
}
