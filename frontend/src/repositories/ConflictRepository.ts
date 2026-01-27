/**
 * Conflict Repository
 * 
 * Manages conflict records returned by the server.
 */

import { db } from '../db/sqlite';
import { Conflict } from '../db/schema';

export interface CreateConflictData {
    operationId: string;
    entity: 'todos' | 'notes';
    entityId: string;
    serverData: any;
    clientData: any;
    serverVersion: number;
    clientVersion: number;
}

export class ConflictRepository {
    /**
     * Create a new conflict record
     */
    async createConflict(data: CreateConflictData): Promise<Conflict> {
        const conflict: Partial<Conflict> = {
            id: data.operationId, // Use operationId as primary key
            operationId: data.operationId,
            entity: data.entity,
            entityId: data.entityId,
            serverData: JSON.stringify(data.serverData),
            clientData: JSON.stringify(data.clientData),
            serverVersion: data.serverVersion,
            clientVersion: data.clientVersion,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            resolvedAt: null,
        };

        const columns = Object.keys(conflict).join(', ');
        const placeholders = Object.keys(conflict).map(() => '?').join(', ');
        const values = Object.values(conflict);

        await db.execute(
            `INSERT OR REPLACE INTO conflicts (${columns}) VALUES (${placeholders})`,
            values
        );

        return conflict as Conflict;
    }

    /**
     * Get all pending conflicts
     */
    async getPendingConflicts(): Promise<Conflict[]> {
        return db.query<Conflict>(
            `SELECT * FROM conflicts WHERE status = 'PENDING' ORDER BY createdAt DESC`
        );
    }

    /**
     * Get conflict by ID
     */
    async findById(id: string): Promise<Conflict | null> {
        const results = await db.query<Conflict>(
            `SELECT * FROM conflicts WHERE id = ?`,
            [id]
        );
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get conflicts for a specific entity
     */
    async getConflictsForEntity(entity: 'todos' | 'notes', entityId: string): Promise<Conflict[]> {
        return db.query<Conflict>(
            `SELECT * FROM conflicts 
       WHERE entity = ? AND entityId = ? AND status = 'PENDING'
       ORDER BY createdAt DESC`,
            [entity, entityId]
        );
    }

    /**
     * Mark conflict as resolved
     */
    async markAsResolved(id: string): Promise<void> {
        await db.execute(
            `UPDATE conflicts 
       SET status = 'RESOLVED', resolvedAt = ? 
       WHERE id = ?`,
            [new Date().toISOString(), id]
        );
    }

    /**
     * Mark conflict as dismissed
     */
    async markAsDismissed(id: string): Promise<void> {
        await db.execute(
            `UPDATE conflicts 
       SET status = 'DISMISSED', resolvedAt = ? 
       WHERE id = ?`,
            [new Date().toISOString(), id]
        );
    }

    /**
     * Delete a conflict
     */
    async deleteConflict(id: string): Promise<void> {
        await db.execute(
            `DELETE FROM conflicts WHERE id = ?`,
            [id]
        );
    }

    /**
     * Get conflict statistics
     */
    async getStats() {
        const pending = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM conflicts WHERE status = 'PENDING'`
        );
        const resolved = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM conflicts WHERE status = 'RESOLVED'`
        );
        const dismissed = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM conflicts WHERE status = 'DISMISSED'`
        );

        return {
            pending: pending[0].count,
            resolved: resolved[0].count,
            dismissed: dismissed[0].count,
        };
    }

    /**
     * Clear all resolved conflicts
     */
    async clearResolved(): Promise<void> {
        await db.execute(
            `DELETE FROM conflicts WHERE status IN ('RESOLVED', 'DISMISSED')`
        );
    }
}
