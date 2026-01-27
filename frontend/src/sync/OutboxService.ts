/**
 * Outbox Service
 * 
 * Manages the outbox queue and prepares operations for sync.
 */

import { OutboxRepository } from '../repositories/OutboxRepository';
import { OutboxEntry } from '../db/schema';

export class OutboxService {
    private repository = new OutboxRepository();

    /**
     * Add a CREATE operation to outbox
     */
    async queueCreate(entity: 'todos' | 'notes', entityId: string, data: any): Promise<void> {
        const operationId = crypto.randomUUID();

        await this.repository.addOperation({
            operationId,
            entity,
            entityId,
            action: 'CREATE',
            payload: data,
        });

        console.log(`[Outbox] Queued CREATE for ${entity}:${entityId}`);
    }

    /**
     * Add an UPDATE operation to outbox
     */
    async queueUpdate(entity: 'todos' | 'notes', entityId: string, data: any): Promise<void> {
        const operationId = crypto.randomUUID();

        await this.repository.addOperation({
            operationId,
            entity,
            entityId,
            action: 'UPDATE',
            payload: data,
        });

        console.log(`[Outbox] Queued UPDATE for ${entity}:${entityId}`);
    }

    /**
     * Add a DELETE operation to outbox
     */
    async queueDelete(entity: 'todos' | 'notes', entityId: string, data: any): Promise<void> {
        const operationId = crypto.randomUUID();

        await this.repository.addOperation({
            operationId,
            entity,
            entityId,
            action: 'DELETE',
            payload: data,
        });

        console.log(`[Outbox] Queued DELETE for ${entity}:${entityId}`);
    }

    /**
     * Get all pending operations ready for sync
     */
    async getPendingOperations(): Promise<OutboxEntry[]> {
        return this.repository.getPendingOperations();
    }

    /**
     * Mark operation as synced
     */
    async markAsSynced(operationId: string): Promise<void> {
        await this.repository.markAsSynced(operationId);
    }

    /**
     * Handle operation failure
     */
    async handleFailure(operationId: string, error: string): Promise<void> {
        await this.repository.incrementRetry(operationId, error);
    }

    /**
     * Remove operation from outbox
     */
    async removeOperation(operationId: string): Promise<void> {
        await this.repository.deleteOperation(operationId);
    }

    /**
     * Get pending operation count
     */
    async getPendingCount(): Promise<number> {
        const stats = await this.repository.getStats();
        return stats.pending;
    }

    /**
     * Clear all synced operations (cleanup)
     */
    async clearSynced(): Promise<void> {
        await this.repository.clearSynced();
    }
}
