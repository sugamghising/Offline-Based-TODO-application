import type { Request, Response } from 'express';
import { handleServiceResponse, ServiceResponseBuilder } from '@/utils';
import { ConflictsService } from './conflictsService';
import { ResolveConflictSchema, type ResolveConflictDTO } from './conflictsSchemas';
import logger from '@/logger';

/**
 * ConflictsController
 * HTTP request handler for conflict management endpoints.
 */
export class ConflictsController {
    private conflictsService: ConflictsService;

    constructor() {
        this.conflictsService = new ConflictsService();
    }

    /**
     * GET /api/conflicts
     * Get all conflicts with optional filters
     */
    getAllConflicts = async (req: Request, res: Response): Promise<Response> => {
        const { status, tableName } = req.query;

        const serviceResponse = await this.conflictsService.getAllConflicts(
            status as any,
            tableName as any
        );

        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * GET /api/conflicts/stats
     * Get conflict statistics
     */
    getConflictStats = async (_req: Request, res: Response): Promise<Response> => {
        const serviceResponse = await this.conflictsService.getConflictStats();
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * GET /api/conflicts/:id
     * Get a specific conflict by ID
     */
    getConflictById = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params as { id: string };
        const serviceResponse = await this.conflictsService.getConflictById(id);
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * PUT /api/conflicts/:id/resolve
     * Resolve a conflict by applying a resolution
     */
    resolveConflict = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params as { id: string };
            const dto: ResolveConflictDTO = ResolveConflictSchema.parse(req.body);

            logger.info({ id, resolution: dto.resolution }, 'Resolving conflict');

            const serviceResponse = await this.conflictsService.resolveConflict(id, dto);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error resolving conflict');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid resolution data', error)
            );
        }
    };

    /**
     * PUT /api/conflicts/:id/dismiss
     * Dismiss a conflict without applying changes
     */
    dismissConflict = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params as { id: string };

        logger.info({ id }, 'Dismissing conflict');

        const serviceResponse = await this.conflictsService.dismissConflict(id);
        return handleServiceResponse(res, serviceResponse);
    };
}

export const conflictsController = new ConflictsController();
