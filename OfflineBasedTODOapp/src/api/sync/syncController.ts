import type { Request, Response } from 'express';
import { handleServiceResponse, ServiceResponseBuilder } from '@/utils';
import { SyncService } from './syncService';
import { SyncRequestSchema, type SyncRequest } from './syncSchemas';
import logger from '@/logger';

/**
 * SyncController
 * HTTP request handler for sync endpoints.
 * Validates batch operations and orchestrates sync process.
 */
export class SyncController {
    private syncService: SyncService;

    constructor() {
        this.syncService = new SyncService();
    }

    /**
     * POST /api/sync
     * Process a batch of sync operations from offline client
     */
    sync = async (req: Request, res: Response): Promise<Response> => {
        try {
            // Validate request body
            const syncRequest: SyncRequest = SyncRequestSchema.parse(req.body);

            logger.info(
                { operationCount: syncRequest.operations.length },
                'Sync request received'
            );

            // Process all operations
            const results = await this.syncService.processSyncOperations(
                syncRequest.operations
            );

            // Return results for each operation
            return res.status(200).json({
                success: true,
                message: 'Sync completed',
                data: {
                    results,
                    summary: {
                        total: results.length,
                        applied: results.filter((r) => r.status === 'APPLIED').length,
                        conflicts: results.filter((r) => r.status === 'CONFLICT').length,
                        errors: results.filter((r) => r.status === 'ERROR').length,
                    },
                },
            });
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error in sync request');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid sync request', error)
            );
        }
    };
}

export const syncController = new SyncController();
