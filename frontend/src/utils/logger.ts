/**
 * Frontend Logger Utility
 * 
 * Provides structured logging for the frontend application.
 * Logs are displayed in console and can be persisted to localStorage.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private logs: LogEntry[] = [];
    private maxLogs = 100;
    private storageKey = 'app_logs';
    private enabled = true;

    private constructor() {
        this.loadLogsFromStorage();
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private loadLogsFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('[Logger] Failed to load logs from storage:', error);
        }
    }

    private saveLogsToStorage(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (error) {
            console.warn('[Logger] Failed to save logs to storage:', error);
        }
    }

    private log(level: LogLevel, context: string, message: string, data?: any): void {
        if (!this.enabled) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context,
            message,
            data,
        };

        // Add to in-memory logs
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Save to localStorage
        this.saveLogsToStorage();

        // Console output
        const consoleMethod = console[level] || console.log;
        const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${context}]`;

        if (data !== undefined) {
            consoleMethod(prefix, message, data);
        } else {
            consoleMethod(prefix, message);
        }

        // For errors, also show stack trace if available
        if (level === 'error' && data instanceof Error) {
            console.error('Stack trace:', data.stack);
        }
    }

    debug(context: string, message: string, data?: any): void {
        this.log('debug', context, message, data);
    }

    info(context: string, message: string, data?: any): void {
        this.log('info', context, message, data);
    }

    warn(context: string, message: string, data?: any): void {
        this.log('warn', context, message, data);
    }

    error(context: string, message: string, data?: any): void {
        this.log('error', context, message, data);
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
        localStorage.removeItem(this.storageKey);
        console.log('[Logger] Logs cleared');
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }
}

export const logger = Logger.getInstance();
export type { LogEntry, LogLevel };
