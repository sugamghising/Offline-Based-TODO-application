/**
 * Conflict Service
 * 
 * Handles conflict storage and resolution.
 */

import { ConflictRepository, CreateConflictData } from '../repositories/ConflictRepository';
import { Conflict } from '../db/schema';
import { apiClient } from '../utils/apiClient';

export type ResolutionChoice = 'CLIENT' | 'SERVER' | 'CUSTOM';

export interface ResolveConflictData {
    conflictId: string;
    resolution: ResolutionChoice;
    customData?: any;
}

export class ConflictService {
    private repository = new ConflictRepository();

    /**
     * Store a new conflict locally
     */
    async storeConflict(data: CreateConflictData): Promise<Conflict> {
        console.log(`[Conflict] Storing conflict for ${data.entity}:${data.entityId}`);
        return this.repository.createConflict(data);
    }

    /**
     * Get all pending conflicts
     */
    async getPendingConflicts(): Promise<Conflict[]> {
        return this.repository.getPendingConflicts();
    }

    /**
     * Get conflict by ID
     */
    async getConflictById(id: string): Promise<Conflict | null> {
        return this.repository.findById(id);
    }

    /**
     * Resolve a conflict
     * This sends the resolution to the server and updates local state
     */
    async resolveConflict(data: ResolveConflictData): Promise<any> {
        const conflict = await this.repository.findById(data.conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${data.conflictId}`);
        }

        // Prepare resolution payload based on choice
        let resolvedData: any;

        if (data.resolution === 'SERVER') {
            resolvedData = JSON.parse(conflict.serverData);
        } else if (data.resolution === 'CLIENT') {
            resolvedData = JSON.parse(conflict.clientData);
        } else {
            resolvedData = data.customData;
        }

        // Send to server
        const response = await apiClient.resolveConflict(data.conflictId, {
            resolution: data.resolution,
            resolvedData,
        });

        // Mark as resolved locally
        await this.repository.markAsResolved(data.conflictId);

        console.log(`[Conflict] Resolved conflict ${data.conflictId} with ${data.resolution}`);

        return response;
    }

    /**
     * Dismiss a conflict (manual dismissal without resolution)
     */
    async dismissConflict(conflictId: string): Promise<void> {
        await this.repository.markAsDismissed(conflictId);
        console.log(`[Conflict] Dismissed conflict ${conflictId}`);
    }

    /**
     * Get conflicts for a specific entity
     */
    async getConflictsForEntity(entity: 'todos' | 'notes', entityId: string): Promise<Conflict[]> {
        return this.repository.getConflictsForEntity(entity, entityId);
    }

    /**
     * Get conflict count
     */
    async getConflictCount(): Promise<number> {
        const stats = await this.repository.getStats();
        return stats.pending;
    }

    /**
     * Clear resolved conflicts
     */
    async clearResolved(): Promise<void> {
        await this.repository.clearResolved();
    }

    /**
     * Parse conflict data for display
     */
    parseConflictData(conflict: Conflict) {
        return {
            id: conflict.id,
            entity: conflict.entity,
            entityId: conflict.entityId,
            serverData: JSON.parse(conflict.serverData),
            clientData: JSON.parse(conflict.clientData),
            serverVersion: conflict.serverVersion,
            clientVersion: conflict.clientVersion,
            status: conflict.status,
            createdAt: conflict.createdAt,
        };
    }
}
