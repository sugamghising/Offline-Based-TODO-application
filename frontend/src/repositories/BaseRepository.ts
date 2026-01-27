/**
 * Base Repository
 * 
 * Provides common database operations for all entities.
 * Follows the Repository Pattern for data access abstraction.
 */

import { db } from '../db/sqlite';

export abstract class BaseRepository<T> {
    constructor(protected tableName: string) { }

    /**
     * Find record by ID
     */
    async findById(id: string): Promise<T | null> {
        const results = await db.query<T>(
            `SELECT * FROM ${this.tableName} WHERE id = ? AND deletedAt IS NULL`,
            [id]
        );
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all non-deleted records
     */
    async findAll(): Promise<T[]> {
        return db.query<T>(
            `SELECT * FROM ${this.tableName} WHERE deletedAt IS NULL ORDER BY updatedAt DESC`
        );
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<T> {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        await db.execute(
            `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
            values
        );

        const id = (data as any).id;
        const created = await this.findById(id);
        if (!created) {
            throw new Error(`Failed to create record in ${this.tableName}`);
        }
        return created;
    }

    /**
     * Update a record
     */
    async update(id: string, data: Partial<T>): Promise<T> {
        const entries = Object.entries(data);
        const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
        const values = [...entries.map(([, value]) => value), id];

        await db.execute(
            `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? AND deletedAt IS NULL`,
            values
        );

        const updated = await this.findById(id);
        if (!updated) {
            throw new Error(`Failed to update record in ${this.tableName}`);
        }
        return updated;
    }

    /**
     * Soft delete a record
     */
    async softDelete(id: string): Promise<void> {
        const now = new Date().toISOString();
        await db.execute(
            `UPDATE ${this.tableName} SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`,
            [now, id]
        );
    }

    /**
     * Hard delete a record (use with caution)
     */
    async hardDelete(id: string): Promise<void> {
        await db.execute(
            `DELETE FROM ${this.tableName} WHERE id = ?`,
            [id]
        );
    }

    /**
     * Count non-deleted records
     */
    async count(): Promise<number> {
        const result = await db.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deletedAt IS NULL`
        );
        return result[0].count;
    }
}
