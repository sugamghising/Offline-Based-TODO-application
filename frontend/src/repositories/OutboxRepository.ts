/**
 * Outbox Repository
 * 
 * Manages the outbox queue for offline operations.
 * This is critical for offline-first functionality.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/sqlite';
import { OutboxEntry } from '../db/schema';

export interface CreateOutboxEntry {
    operationId: string;
    entity: 'todos' | 'notes';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: any;
}

export class OutboxRepository {
    /**
     * Add a new operation to the outbox
     * This happens EVERY time user makes a change
     */
    async addOperation(data: CreateOutboxEntry): Promise<OutboxEntry> {
        const entry: Partial<OutboxEntry> = {
            id: uuidv4(),
            operationId: data.operationId,
            entity: data.entity,
            entityId: data.entityId,
            action: data.action,
            payload: JSON.stringify(data.payload),
            createdAt: new Date().toISOString(),
            synced: 0,
            retryCount: 0,
            lastError: null,
        };

        const columns = Object.keys(entry).join(', ');
        const placeholders = Object.keys(entry).map(() => '?').join(', ');
        const values = Object.values(entry);

        await db.execute(
            `INSERT INTO outbox (${columns}) VALUES (${placeholders})`,
            values
        );

        return entry as OutboxEntry;
    }

    /**
     * Get all pending (unsynced) operations
     */
    async getPendingOperations(): Promise<OutboxEntry[]> {
        return db.query<OutboxEntry>(
            `SELECT * FROM outbox WHERE synced = 0 ORDER BY createdAt ASC`
        );
    }

    /**
     * Mark an operation as synced
     */
    async markAsSynced(operationId: string): Promise<void> {
        await db.execute(
            `UPDATE outbox SET synced = 1 WHERE operationId = ?`,
            [operationId]
        );
    }

    /**
     * Increment retry count and update error
     */
    async incrementRetry(operationId: string, error: string): Promise<void> {
        await db.execute(
            `UPDATE outbox 
       SET retryCount = retryCount + 1, lastError = ? 
       WHERE operationId = ?`,
            [error, operationId]
        );
    }

    /**
     * Delete an operation from outbox
     * Use after successful sync or manual removal
     */
    async deleteOperation(operationId: string): Promise<void> {
        await db.execute(
            `DELETE FROM outbox WHERE operationId = ?`,
            [operationId]
        );
    }

    /**
     * Get operations for a specific entity
     */
    async getOperationsForEntity(entity: 'todos' | 'notes', entityId: string): Promise<OutboxEntry[]> {
        return db.query<OutboxEntry>(
            `SELECT * FROM outbox 
       WHERE entity = ? AND entityId = ? 
       ORDER BY createdAt ASC`,
            [entity, entityId]
        );
    }

    /**
     * Clear all synced operations
     */
    async clearSynced(): Promise<void> {
        await db.execute(`DELETE FROM outbox WHERE synced = 1`);
    }

    /**
     * Get outbox statistics
     */
    async getStats() {
        const pending = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM outbox WHERE synced = 0`
        );
        const synced = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM outbox WHERE synced = 1`
        );
        const failed = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM outbox WHERE synced = 0 AND retryCount > 0`
        );

        return {
            pending: pending[0].count,
            synced: synced[0].count,
            failed: failed[0].count,
        };
    }

    /**
     * Get all operations (for debugging)
     */
    async getAll(): Promise<OutboxEntry[]> {
        return db.query<OutboxEntry>(
            `SELECT * FROM outbox ORDER BY createdAt DESC`
        );
    }
}
