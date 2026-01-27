/**
 * Sync Engine
 * 
 * The heart of offline-first functionality.
 * Handles synchronization between local SQLite and remote server.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Batch pending operations from outbox
 * 2. Send to server via API
 * 3. Process responses (APPLIED/CONFLICT/ERROR)
 * 4. Update local state accordingly
 * 5. Store conflicts for manual resolution
 */

import { OutboxService } from './OutboxService';
import { ConflictService } from './ConflictService';
import { apiClient, SyncOperation } from '../utils/apiClient';
import { networkDetector } from '../utils/networkDetector';
import { db } from '../db/sqlite';

export interface SyncResult {
    success: boolean;
    applied: number;
    conflicts: number;
    errors: number;
    message: string;
}

type SyncListener = (result: SyncResult) => void;

export class SyncEngine {
    private static instance: SyncEngine;
    private outboxService = new OutboxService();
    private conflictService = new ConflictService();

    private isSyncing = false;
    private syncListeners: Set<SyncListener> = new Set();
    private autoSyncInterval: number | null = null;

    private constructor() {
        this.setupNetworkListener();
    }

    static getInstance(): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }

    /**
     * Setup listener for network reconnection
     * Auto-sync when connection is restored
     */
    private setupNetworkListener() {
        networkDetector.addListener((isOnline) => {
            if (isOnline) {
                console.log('[Sync] Network restored, triggering sync...');
                this.sync().catch(console.error);
            }
        });
    }

    /**
     * Main sync function
     * Called manually, on network restore, or on app start
     */
    async sync(): Promise<SyncResult> {
        // Prevent concurrent syncs
        if (this.isSyncing) {
            console.log('[Sync] Sync already in progress, skipping');
            return {
                success: false,
                applied: 0,
                conflicts: 0,
                errors: 0,
                message: 'Sync already in progress',
            };
        }

        // Check network
        if (!networkDetector.isOnline) {
            console.log('[Sync] Offline, skipping sync');
            return {
                success: false,
                applied: 0,
                conflicts: 0,
                errors: 0,
                message: 'Device is offline',
            };
        }

        this.isSyncing = true;
        console.log('[Sync] Starting sync...');

        try {
            // Get all pending operations
            const pendingOps = await this.outboxService.getPendingOperations();

            if (pendingOps.length === 0) {
                console.log('[Sync] No pending operations');
                return {
                    success: true,
                    applied: 0,
                    conflicts: 0,
                    errors: 0,
                    message: 'No pending operations',
                };
            }

            console.log(`[Sync] Found ${pendingOps.length} pending operations`);

            // Convert to sync operations
            const operations: SyncOperation[] = pendingOps.map((op) => ({
                operationId: op.operationId,
                action: op.action,
                table: op.entity,
                data: JSON.parse(op.payload),
            }));

            // Send to server
            const response = await apiClient.sync(operations);

            if (!response.success) {
                throw new Error(response.message || 'Sync failed');
            }

            // Process results
            const result = await this.processResults(response.data.results);

            // Notify listeners
            this.notifyListeners(result);

            console.log('[Sync] Sync completed:', result);
            return result;

        } catch (error) {
            console.error('[Sync] Sync failed:', error);
            const result: SyncResult = {
                success: false,
                applied: 0,
                conflicts: 0,
                errors: 1,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            this.notifyListeners(result);
            return result;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process sync results from server
     */
    private async processResults(results: Array<{
        operationId: string;
        status: 'APPLIED' | 'CONFLICT' | 'ERROR';
        message?: string;
        data?: any;
        conflictId?: string;
    }>): Promise<SyncResult> {
        let applied = 0;
        let conflicts = 0;
        let errors = 0;

        for (const result of results) {
            try {
                if (result.status === 'APPLIED') {
                    // Success! Update local record with server data
                    await this.handleApplied(result);
                    applied++;
                } else if (result.status === 'CONFLICT') {
                    // Conflict detected, store for manual resolution
                    await this.handleConflict(result);
                    conflicts++;
                } else {
                    // Error occurred
                    await this.handleError(result);
                    errors++;
                }
            } catch (error) {
                console.error('[Sync] Error processing result:', error, result);
                errors++;
            }
        }

        return {
            success: true,
            applied,
            conflicts,
            errors,
            message: `Sync completed: ${applied} applied, ${conflicts} conflicts, ${errors} errors`,
        };
    }

    /**
     * Handle successfully applied operation
     */
    private async handleApplied(result: {
        operationId: string;
        data?: any;
    }): Promise<void> {
        // Mark outbox entry as synced
        await this.outboxService.markAsSynced(result.operationId);

        // Update local record with server's version
        // This ensures we have the latest version number
        if (result.data) {
            const entity = result.data.deletedAt ? null : (result.data.status ? 'todos' : 'notes');

            if (entity === 'todos') {
                await db.execute(
                    `UPDATE todos SET version = ?, updatedAt = ? WHERE id = ?`,
                    [result.data.version, result.data.updatedAt, result.data.id]
                );
            } else if (entity === 'notes') {
                await db.execute(
                    `UPDATE notes SET version = ?, updatedAt = ? WHERE id = ?`,
                    [result.data.version, result.data.updatedAt, result.data.id]
                );
            }
        }

        console.log(`[Sync] Applied operation ${result.operationId}`);
    }

    /**
     * Handle conflict
     */
    private async handleConflict(result: {
        operationId: string;
        message?: string;
        data?: any;
    }): Promise<void> {
        // Do NOT mark as synced - keep in outbox
        // Store conflict for manual resolution

        // The server should provide conflict details in data
        if (result.data) {
            await this.conflictService.storeConflict({
                operationId: result.operationId,
                entity: result.data.entity,
                entityId: result.data.entityId,
                serverData: result.data.serverData,
                clientData: result.data.clientData,
                serverVersion: result.data.serverVersion,
                clientVersion: result.data.clientVersion,
            });
        }

        console.log(`[Sync] Conflict detected for operation ${result.operationId}`);
    }

    /**
     * Handle error
     */
    private async handleError(result: {
        operationId: string;
        message?: string;
    }): Promise<void> {
        // If operation was already processed, remove it from outbox
        // This is not a real error - the operation was already applied
        if (result.message === 'Operation already processed') {
            await this.outboxService.markAsSynced(result.operationId);
            console.log(`[Sync] Operation ${result.operationId} already processed, removing from outbox`);
            return;
        }

        // Increment retry count for real errors
        await this.outboxService.handleFailure(
            result.operationId,
            result.message || 'Unknown error'
        );

        console.error(`[Sync] Error for operation ${result.operationId}:`, result.message);
    }

    /**
     * Add listener for sync events
     */
    addSyncListener(listener: SyncListener): () => void {
        this.syncListeners.add(listener);
        return () => this.syncListeners.delete(listener);
    }

    private notifyListeners(result: SyncResult) {
        this.syncListeners.forEach((listener) => {
            try {
                listener(result);
            } catch (error) {
                console.error('[Sync] Error in listener:', error);
            }
        });
    }

    /**
     * Start auto-sync (periodic sync every N seconds)
     */
    startAutoSync(intervalSeconds: number = 30) {
        if (this.autoSyncInterval) {
            this.stopAutoSync();
        }

        console.log(`[Sync] Starting auto-sync every ${intervalSeconds} seconds`);
        this.autoSyncInterval = window.setInterval(() => {
            this.sync().catch(console.error);
        }, intervalSeconds * 1000);
    }

    /**
     * Stop auto-sync
     */
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('[Sync] Auto-sync stopped');
        }
    }

    /**
     * Get sync status
     */
    async getStatus() {
        const pendingCount = await this.outboxService.getPendingCount();
        const conflictCount = await this.conflictService.getConflictCount();

        return {
            isSyncing: this.isSyncing,
            isOnline: networkDetector.isOnline,
            pendingOperations: pendingCount,
            pendingConflicts: conflictCount,
        };
    }

    /**
     * Force sync (bypass checks)
     */
    async forceSync(): Promise<SyncResult> {
        return this.sync();
    }
}

export const syncEngine = SyncEngine.getInstance();
