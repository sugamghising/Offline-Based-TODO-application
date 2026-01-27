/**
 * SQL.js Loader
 * 
 * Wrapper to properly load sql.js in Vite environment.
 * Handles the CommonJS to ESM conversion issues.
 */

import type { Database, SqlJsStatic } from 'sql.js';

export type { Database, SqlJsStatic };

/**
 * Load and initialize sql.js
 */
export async function loadSqlJs(config?: {
    locateFile?: (file: string) => string;
}): Promise<SqlJsStatic> {
    try {
        // Use dynamic import to load sql.js
        const sqlJsModule = await import('sql.js');

        // Handle both CommonJS and ES module exports
        const initSqlJs = (sqlJsModule as any).default || sqlJsModule;

        if (typeof initSqlJs !== 'function') {
            throw new Error('sql.js module did not export a valid initialization function');
        }

        // Initialize with config
        const SQL = await initSqlJs(config);
        return SQL;
    } catch (error) {
        // Don't use logger here to avoid circular dependency
        console.error('[SQL.js] Failed to load:', error);
        throw error;
    }
}
