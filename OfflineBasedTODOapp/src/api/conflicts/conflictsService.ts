import logger from '@/logger';
import { ServiceResponseBuilder, type ServiceResponse } from '@/utils';
import { ConflictsRepository } from './conflictsRepository';
import type { ResolveConflictDTO, ConflictStatus } from './conflictsSchemas';
import type { Conflict } from '@/types/models';
import { prisma } from '@/database/prisma';

/**
 * ConflictsService
 * Business logic for conflict management and resolution.
 */
export class ConflictsService {
    private conflictsRepository: ConflictsRepository;

    constructor(conflictsRepo: ConflictsRepository = new ConflictsRepository()) {
        this.conflictsRepository = conflictsRepo;
    }

    /**
     * Get all conflicts with optional filters
     */
    async getAllConflicts(
        status?: ConflictStatus,
        tableName?: string
    ): Promise<ServiceResponse<Conflict[]>> {
        try {
            const conflicts = await this.conflictsRepository.findAll(status, tableName);
            return ServiceResponseBuilder.success('Conflicts fetched successfully', conflicts);
        } catch (error) {
            logger.error({ error }, 'Error fetching conflicts');
            return ServiceResponseBuilder.internalError<Conflict[]>('Failed to fetch conflicts');
        }
    }

    /**
     * Get conflict by ID
     */
    async getConflictById(id: string): Promise<ServiceResponse<Conflict | null>> {
        try {
            const conflict = await this.conflictsRepository.findById(id);

            if (!conflict) {
                logger.warn(`Conflict with ID ${id} not found`);
                return ServiceResponseBuilder.notFound<Conflict | null>('Conflict');
            }

            return ServiceResponseBuilder.success('Conflict fetched successfully', conflict);
        } catch (error) {
            logger.error({ error, id }, 'Error fetching conflict by ID');
            return ServiceResponseBuilder.internalError<Conflict | null>(
                'Failed to fetch conflict'
            );
        }
    }

    /**
     * Resolve a conflict and apply the resolution to the original table
     */
    async resolveConflict(
        id: string,
        dto: ResolveConflictDTO
    ): Promise<ServiceResponse<Conflict>> {
        try {
            // Fetch conflict
            const conflict = await this.conflictsRepository.findById(id);

            if (!conflict) {
                return ServiceResponseBuilder.notFound<Conflict>('Conflict');
            }

            if (conflict.status !== 'PENDING') {
                return ServiceResponseBuilder.validationError<Conflict>(
                    'Conflict has already been resolved or dismissed'
                );
            }

            // Determine what data to apply
            let dataToApply: any;

            if (dto.resolution === 'CLIENT') {
                dataToApply = conflict.clientData;
            } else if (dto.resolution === 'SERVER') {
                dataToApply = conflict.serverData;
            } else if (dto.resolution === 'CUSTOM') {
                if (!dto.resolvedData) {
                    return ServiceResponseBuilder.validationError<Conflict>(
                        'resolvedData is required for CUSTOM resolution'
                    );
                }
                dataToApply = dto.resolvedData;
            } else {
                return ServiceResponseBuilder.validationError<Conflict>(
                    'Invalid resolution type'
                );
            }

            // Apply resolution to original table using transaction
            const result = await prisma.$transaction(async (tx) => {
                // Get the model
                const model = conflict.tableName === 'todos' ? tx.todo : tx.note;

                // Update the original record
                const { id: recordId, version, ...updateData } = dataToApply;

                await (model as any).update({
                    where: { id: conflict.recordId },
                    data: {
                        ...updateData,
                        version: {
                            increment: 1,
                        },
                    },
                });

                // Mark conflict as resolved
                const resolvedConflict = await tx.conflict.update({
                    where: { id },
                    data: {
                        status: 'RESOLVED',
                        resolvedData: dataToApply,
                        resolvedAt: new Date(),
                    },
                });

                return resolvedConflict;
            });

            logger.info(
                { conflictId: id, resolution: dto.resolution },
                'Conflict resolved'
            );

            return ServiceResponseBuilder.success('Conflict resolved successfully', result);
        } catch (error) {
            logger.error({ error, id, dto }, 'Error resolving conflict');
            return ServiceResponseBuilder.internalError<Conflict>('Failed to resolve conflict');
        }
    }

    /**
     * Dismiss a conflict without applying changes
     */
    async dismissConflict(id: string): Promise<ServiceResponse<Conflict>> {
        try {
            const conflict = await this.conflictsRepository.findById(id);

            if (!conflict) {
                return ServiceResponseBuilder.notFound<Conflict>('Conflict');
            }

            if (conflict.status !== 'PENDING') {
                return ServiceResponseBuilder.validationError<Conflict>(
                    'Conflict has already been resolved or dismissed'
                );
            }

            const dismissedConflict = await this.conflictsRepository.dismiss(id);

            if (!dismissedConflict) {
                return ServiceResponseBuilder.internalError<Conflict>(
                    'Failed to dismiss conflict'
                );
            }

            logger.info({ conflictId: id }, 'Conflict dismissed');

            return ServiceResponseBuilder.success(
                'Conflict dismissed successfully',
                dismissedConflict
            );
        } catch (error) {
            logger.error({ error, id }, 'Error dismissing conflict');
            return ServiceResponseBuilder.internalError<Conflict>(
                'Failed to dismiss conflict'
            );
        }
    }

    /**
     * Get conflict statistics
     */
    async getConflictStats(): Promise<ServiceResponse<any>> {
        try {
            const pendingCounts = await this.conflictsRepository.getPendingCountByTable();
            const allConflicts = await this.conflictsRepository.findAll();

            const stats = {
                total: allConflicts.length,
                pending: allConflicts.filter((c) => c.status === 'PENDING').length,
                resolved: allConflicts.filter((c) => c.status === 'RESOLVED').length,
                dismissed: allConflicts.filter((c) => c.status === 'DISMISSED').length,
                byTable: pendingCounts,
            };

            return ServiceResponseBuilder.success('Statistics fetched successfully', stats);
        } catch (error) {
            logger.error({ error }, 'Error fetching conflict stats');
            return ServiceResponseBuilder.internalError('Failed to fetch statistics');
        }
    }
}
