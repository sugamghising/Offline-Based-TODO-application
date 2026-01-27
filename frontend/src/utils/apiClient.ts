/**
 * API Client
 * 
 * Handles all HTTP communication with the backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface SyncOperation {
    operationId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    table: 'todos' | 'notes';
    data: any;
}

export interface SyncResponse {
    success: boolean;
    message: string;
    data: {
        results: Array<{
            operationId: string;
            status: 'APPLIED' | 'CONFLICT' | 'ERROR';
            message?: string;
            data?: any;
            conflictId?: string;
        }>;
        summary: {
            total: number;
            applied: number;
            conflicts: number;
            errors: number;
        };
    };
}

export interface ResolveConflictPayload {
    resolvedData?: any;
    resolution: 'CLIENT' | 'SERVER' | 'CUSTOM';
}

class ApiClient {
    /**
     * Batch sync operations to server
     */
    async sync(operations: SyncOperation[]): Promise<SyncResponse> {
        const response = await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ operations }),
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Resolve a conflict
     */
    async resolveConflict(conflictId: string, payload: ResolveConflictPayload): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/conflicts/${conflictId}/resolve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Conflict resolution failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get all pending conflicts
     */
    async getConflicts(): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/conflicts?status=PENDING`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch conflicts: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const apiClient = new ApiClient();
