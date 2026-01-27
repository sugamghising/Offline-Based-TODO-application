import logger from '@/logger';
import { SyncRepository } from './syncRepository';
import type {
    SyncOperation,
    OperationResult,
    TableName,
} from './syncSchemas';

/**
 * SyncService
 * Core business logic for offline-first sync operations.
 * Handles batch operations, conflict detection, and version management.
 */
export class SyncService {
    private syncRepository: SyncRepository;

    constructor(syncRepo: SyncRepository = new SyncRepository()) {
        this.syncRepository = syncRepo;
    }

    /**
     * Process a batch of sync operations
     * Each operation is processed independently
     */
    async processSyncOperations(
        operations: SyncOperation[]
    ): Promise<OperationResult[]> {
        logger.info({ count: operations.length }, 'Processing sync operations');

        const results: OperationResult[] = [];

        // Process each operation sequentially to maintain data integrity
        for (const operation of operations) {
            const result = await this.processSingleOperation(operation);
            results.push(result);
        }

        const stats = this.calculateStats(results);
        logger.info(stats, 'Sync batch completed');

        return results;
    }

    /**
     * Process a single sync operation
     * Handles CREATE, UPDATE, DELETE with conflict detection
     */
    private async processSingleOperation(
        operation: SyncOperation
    ): Promise<OperationResult> {
        try {
            const { operationId, action, table, data } = operation;

            // Check for duplicate operation (idempotency)
            const isDuplicate = await this.syncRepository.conflictExists(operationId);
            if (isDuplicate) {
                logger.warn({ operationId }, 'Duplicate operation detected');
                return {
                    operationId,
                    status: 'ERROR',
                    message: 'Operation already processed',
                };
            }

            switch (action) {
                case 'CREATE':
                    return await this.handleCreate(operationId, table, data);
                case 'UPDATE':
                    return await this.handleUpdate(operationId, table, data);
                case 'DELETE':
                    return await this.handleDelete(operationId, table, data);
                default:
                    return {
                        operationId,
                        status: 'ERROR',
                        message: 'Unknown action type',
                    };
            }
        } catch (error) {
            logger.error({ error, operation }, 'Error processing sync operation');
            return {
                operationId: operation.operationId,
                status: 'ERROR',
                message: 'Internal server error',
            };
        }
    }

    /**
     * Handle CREATE operation
     * Simply creates a new record with version = 1
     */
    private async handleCreate(
        operationId: string,
        table: TableName,
        data: any
    ): Promise<OperationResult> {
        try {
            const record = await this.syncRepository.createRecord(table, data);

            // Mark operation as processed
            await this.syncRepository.markOperationProcessed(operationId, 'CREATE', table);

            logger.info({ operationId, table, recordId: record.id }, 'Record created');

            return {
                operationId,
                status: 'APPLIED',
                message: 'Record created successfully',
                data: record,
            };
        } catch (error: any) {
            logger.error({ error, operationId }, 'Error creating record');
            return {
                operationId,
                status: 'ERROR',
                message: error?.message || 'Failed to create record',
            };
        }
    }

    /**
     * Handle UPDATE operation
     * Checks version and creates conflict if mismatch
     */
    private async handleUpdate(
        operationId: string,
        table: TableName,
        data: any
    ): Promise<OperationResult> {
        const { id, version: clientVersion, ...updateData } = data;

        if (!id || clientVersion === undefined) {
            return {
                operationId,
                status: 'ERROR',
                message: 'Missing id or version in update data',
            };
        }

        // Fetch current server record
        const serverRecord = await this.syncRepository.findRecordById(table, id);

        // Record doesn't exist on server - create conflict
        if (!serverRecord) {
            const conflict = await this.syncRepository.createConflict(
                operationId,
                table,
                id,
                null, // No server data
                data,
                0,
                clientVersion
            );

            logger.warn({ operationId, conflictId: conflict.id }, 'Conflict: Record not found');

            return {
                operationId,
                status: 'CONFLICT',
                message: 'Record not found on server',
                conflictId: conflict.id,
            };
        }

        // Version mismatch - create conflict
        if (serverRecord.version !== clientVersion) {
            const conflict = await this.syncRepository.createConflict(
                operationId,
                table,
                id,
                serverRecord,
                data,
                serverRecord.version,
                clientVersion
            );

            logger.warn(
                {
                    operationId,
                    conflictId: conflict.id,
                    serverVersion: serverRecord.version,
                    clientVersion,
                },
                'Conflict: Version mismatch'
            );

            return {
                operationId,
                status: 'CONFLICT',
                message: 'Version conflict detected',
                conflictId: conflict.id,
            };
        }

        // Versions match - apply update
        const updatedRecord = await this.syncRepository.updateRecordWithVersionCheck(
            table,
            id,
            clientVersion,
            updateData
        );

        if (!updatedRecord) {
            // Race condition: record was modified between checks
            return {
                operationId,
                status: 'ERROR',
                message: 'Failed to update record (race condition)',
            };
        }

        // Mark operation as processed
        await this.syncRepository.markOperationProcessed(operationId, 'UPDATE', table);

        logger.info({ operationId, recordId: id }, 'Record updated');

        return {
            operationId,
            status: 'APPLIED',
            message: 'Record updated successfully',
            data: updatedRecord,
        };
    }

    /**
     * Handle DELETE operation
     * Checks version and creates conflict if mismatch
     */
    private async handleDelete(
        operationId: string,
        table: TableName,
        data: any
    ): Promise<OperationResult> {
        const { id, version: clientVersion } = data;

        if (!id || clientVersion === undefined) {
            return {
                operationId,
                status: 'ERROR',
                message: 'Missing id or version in delete data',
            };
        }

        // Fetch current server record
        const serverRecord = await this.syncRepository.findRecordById(table, id);

        // Record doesn't exist or already deleted - still consider it applied
        if (!serverRecord || serverRecord.deletedAt) {
            // Mark operation as processed
            await this.syncRepository.markOperationProcessed(operationId, 'DELETE', table);

            logger.info({ operationId, recordId: id }, 'Delete applied (already deleted)');
            return {
                operationId,
                status: 'APPLIED',
                message: 'Record already deleted',
            };
        }

        // Version mismatch - create conflict
        if (serverRecord.version !== clientVersion) {
            const conflict = await this.syncRepository.createConflict(
                operationId,
                table,
                id,
                serverRecord,
                data,
                serverRecord.version,
                clientVersion
            );

            logger.warn(
                {
                    operationId,
                    conflictId: conflict.id,
                    serverVersion: serverRecord.version,
                    clientVersion,
                },
                'Conflict: Version mismatch on delete'
            );

            return {
                operationId,
                status: 'CONFLICT',
                message: 'Version conflict detected',
                conflictId: conflict.id,
            };
        }

        // Versions match - apply soft delete
        const deletedRecord = await this.syncRepository.deleteRecordWithVersionCheck(
            table,
            id,
            clientVersion
        );

        if (!deletedRecord) {
            return {
                operationId,
                status: 'ERROR',
                message: 'Failed to delete record (race condition)',
            };
        }

        // Mark operation as processed
        await this.syncRepository.markOperationProcessed(operationId, 'DELETE', table);

        logger.info({ operationId, recordId: id }, 'Record deleted');

        return {
            operationId,
            status: 'APPLIED',
            message: 'Record deleted successfully',
            data: deletedRecord,
        };
    }

    /**
     * Calculate statistics for sync batch
     */
    private calculateStats(results: OperationResult[]) {
        return {
            total: results.length,
            applied: results.filter((r) => r.status === 'APPLIED').length,
            conflicts: results.filter((r) => r.status === 'CONFLICT').length,
            errors: results.filter((r) => r.status === 'ERROR').length,
        };
    }
}
