import { prisma } from '@/database/prisma';
import type { TableName } from './syncSchemas';

/**
 * SyncRepository
 * Handles database operations for the sync process.
 * Manages transactions, version checks, and conflict storage.
 */
export class SyncRepository {
    /**
     * Find a record by ID (including soft-deleted for conflict detection)
     */
    async findRecordById(
        tableName: TableName,
        id: string
    ): Promise<any | null> {
        if (tableName === 'todos') {
            return await prisma.todo.findUnique({
                where: { id },
            });
        } else {
            return await prisma.note.findUnique({
                where: { id },
            });
        }
    }

    /**
     * Create a new record (version = 1)
     */
    async createRecord(
        tableName: TableName,
        data: any
    ): Promise<any> {
        if (tableName === 'todos') {
            return await prisma.todo.create({
                data: {
                    ...data,
                    version: 1,
                },
            });
        } else {
            return await prisma.note.create({
                data: {
                    ...data,
                    version: 1,
                },
            });
        }
    }

    /**
     * Update a record with version check
     * Returns null if version mismatch or record not found
     */
    async updateRecordWithVersionCheck(
        tableName: TableName,
        id: string,
        clientVersion: number,
        data: any
    ): Promise<any | null> {
        try {
            if (tableName === 'todos') {
                return await prisma.todo.update({
                    where: {
                        id,
                        version: clientVersion,
                        deletedAt: null,
                    },
                    data: {
                        ...data,
                        version: {
                            increment: 1,
                        },
                    },
                });
            } else {
                return await prisma.note.update({
                    where: {
                        id,
                        version: clientVersion,
                        deletedAt: null,
                    },
                    data: {
                        ...data,
                        version: {
                            increment: 1,
                        },
                    },
                });
            }
        } catch (error) {
            // Record not found or version mismatch
            return null;
        }
    }

    /**
     * Soft delete a record with version check
     * Returns null if version mismatch or record not found
     */
    async deleteRecordWithVersionCheck(
        tableName: TableName,
        id: string,
        clientVersion: number
    ): Promise<any | null> {
        try {
            if (tableName === 'todos') {
                return await prisma.todo.update({
                    where: {
                        id,
                        version: clientVersion,
                        deletedAt: null,
                    },
                    data: {
                        deletedAt: new Date(),
                        version: {
                            increment: 1,
                        },
                    },
                });
            } else {
                return await prisma.note.update({
                    where: {
                        id,
                        version: clientVersion,
                        deletedAt: null,
                    },
                    data: {
                        deletedAt: new Date(),
                        version: {
                            increment: 1,
                        },
                    },
                });
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * Create a conflict record
     */
    async createConflict(
        operationId: string,
        tableName: TableName,
        recordId: string,
        serverData: any,
        clientData: any,
        serverVersion: number,
        clientVersion: number
    ): Promise<any> {
        return await prisma.conflict.create({
            data: {
                operationId,
                tableName,
                recordId,
                serverData,
                clientData,
                serverVersion,
                clientVersion,
                status: 'PENDING',
            },
        });
    }

    /**
     * Check if an operation has already been processed (idempotency)
     */
    async operationExists(operationId: string): Promise<boolean> {
        const processed = await prisma.processedOperation.findUnique({
            where: { operationId },
        });
        return !!processed;
    }

    /**
     * Mark an operation as processed
     */
    async markOperationProcessed(
        operationId: string,
        action: string,
        tableName: string
    ): Promise<void> {
        await prisma.processedOperation.create({
            data: {
                operationId,
                action,
                tableName,
            },
        });
    }

    /**
     * Check if a conflict with the same operationId already exists
     */
    async conflictExists(operationId: string): Promise<boolean> {
        return this.operationExists(operationId);
    }
}
