/**
 * SQLite Database Manager
 * 
 * Provides a singleton interface to sql.js WASM SQLite database.
 * Handles initialization, connection management, and query execution.
 */

import { loadSqlJs } from './sql-js-loader';
import type { Database, SqlJsStatic } from './sql-js-loader';
import { CREATE_TABLES_SQL } from './schema';
import { logger } from '../utils/logger';

const DB_NAME = 'offline_todo_app.db';

class SQLiteManager {
    private static instance: SQLiteManager;
    private SQL: SqlJsStatic | null = null;
    private db: Database | null = null;
    private isInitialized = false;

    private constructor() { }

    static getInstance(): SQLiteManager {
        if (!SQLiteManager.instance) {
            SQLiteManager.instance = new SQLiteManager();
        }
        return SQLiteManager.instance;
    }

    /**
     * Initialize the database
     * - Loads sql.js WASM
     * - Restores database from localStorage if exists
     * - Creates tables if needed
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            logger.info('SQLite', 'Initializing database...');

            // Load sql.js WASM module
            this.SQL = await loadSqlJs({
                locateFile: (file: string) => `/sql-wasm/${file}`,
            });

            // Try to restore from localStorage
            const savedDb = localStorage.getItem(DB_NAME);

            if (savedDb) {
                logger.info('SQLite', 'Restoring database from localStorage');
                const buffer = this.base64ToUint8Array(savedDb);
                this.db = new this.SQL.Database(buffer);
            } else {
                logger.info('SQLite', 'Creating new database');
                this.db = new this.SQL.Database();
            }

            // Create tables if they don't exist
            this.db.run(CREATE_TABLES_SQL);

            // Save to localStorage
            this.saveToLocalStorage();

            this.isInitialized = true;
            logger.info('SQLite', 'Database initialized successfully');
        } catch (error) {
            logger.error('SQLite', 'Failed to initialize database', error);
            throw error;
        }
    }

    /**
     * Get the database instance
     * Ensures initialization before returning
     */
    async getDatabase(): Promise<Database> {
        if (!this.isInitialized || !this.db) {
            await this.initialize();
        }
        return this.db!;
    }

    /**
     * Execute a query that returns rows
     */
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const db = await this.getDatabase();
        const results: T[] = [];

        try {
            const stmt = db.prepare(sql);
            stmt.bind(params);

            while (stmt.step()) {
                const row = stmt.getAsObject() as T;
                results.push(row);
            }

            stmt.free();
        } catch (error) {
            logger.error('SQLite', 'Query error', { error, sql, params });
            throw error;
        }

        return results;
    }

    /**
     * Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
     */
    async execute(sql: string, params: any[] = []): Promise<void> {
        const db = await this.getDatabase();

        try {
            db.run(sql, params);
            this.saveToLocalStorage();
        } catch (error) {
            logger.error('SQLite', 'Execute error', { error, sql, params });
            throw error;
        }
    }

    /**
     * Execute multiple statements in a transaction
     * Critical for maintaining data consistency
     */
    async transaction(callback: (db: Database) => void | Promise<void>): Promise<void> {
        const db = await this.getDatabase();

        try {
            db.run('BEGIN TRANSACTION');
            await callback(db);
            db.run('COMMIT');
            this.saveToLocalStorage();
        } catch (error) {
            db.run('ROLLBACK');
            logger.error('SQLite', 'Transaction error', error);
            throw error;
        }
    }

    /**
     * Save database to localStorage for persistence
     * This is what makes the app work offline!
     */
    private saveToLocalStorage(): void {
        if (!this.db) return;

        try {
            const data = this.db.export();
            const base64 = this.uint8ArrayToBase64(data);
            localStorage.setItem(DB_NAME, base64);
        } catch (error) {
            logger.error('SQLite', 'Failed to save to localStorage', error);
        }
    }

    /**
     * Clear all data (useful for logout or reset)
     */
    async clearDatabase(): Promise<void> {
        if (this.db) {
            this.db.close();
        }
        localStorage.removeItem(DB_NAME);
        this.isInitialized = false;
        this.db = null;
        await this.initialize();
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const todos = await this.query('SELECT COUNT(*) as count FROM todos WHERE deletedAt IS NULL');
        const notes = await this.query('SELECT COUNT(*) as count FROM notes WHERE deletedAt IS NULL');
        const outbox = await this.query('SELECT COUNT(*) as count FROM outbox WHERE synced = 0');
        const conflicts = await this.query('SELECT COUNT(*) as count FROM conflicts WHERE status = "PENDING"');

        return {
            todos: todos[0].count,
            notes: notes[0].count,
            pendingSync: outbox[0].count,
            conflicts: conflicts[0].count,
        };
    }

    // Helper methods for base64 encoding/decoding
    private uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}

export const db = SQLiteManager.getInstance();
