import logger from '@/logger';
import { ServiceResponseBuilder, type ServiceResponse } from '@/utils';
import type { BaseRepository } from './BaseRepository';

/**
 * BaseService<T>
 * Generic base service providing common business logic patterns.
 * Handles standard CRUD operations with proper error handling and logging.
 * 
 * @template T - The entity type this service manages
 */
export abstract class BaseService<T> {
    protected abstract repository: BaseRepository<T>;
    protected abstract entityName: string;

    /**
     * Get entity by ID
     */
    async getById(id: string): Promise<ServiceResponse<T | null>> {
        try {
            const entity = await this.repository.findById(id);

            if (!entity) {
                logger.warn(`${this.entityName} with ID ${id} not found`);
                return ServiceResponseBuilder.notFound<T | null>(this.entityName);
            }

            return ServiceResponseBuilder.success(
                `${this.entityName} fetched successfully`,
                entity
            );
        } catch (error) {
            logger.error({ error, id }, `Error fetching ${this.entityName} by ID`);
            return ServiceResponseBuilder.internalError<T | null>(
                `Failed to fetch ${this.entityName}`
            );
        }
    }

    /**
     * Get all entities
     */
    async getAll(): Promise<ServiceResponse<T[]>> {
        try {
            const entities = await this.repository.findAll();
            return ServiceResponseBuilder.success(
                `${this.entityName}s fetched successfully`,
                entities
            );
        } catch (error) {
            logger.error({ error }, `Error fetching all ${this.entityName}s`);
            return ServiceResponseBuilder.internalError<T[]>(
                `Failed to fetch ${this.entityName}s`
            );
        }
    }

    /**
     * Create a new entity
     */
    async create(data: any): Promise<ServiceResponse<T>> {
        try {
            const entity = await this.repository.create(data);
            return ServiceResponseBuilder.success(
                `${this.entityName} created successfully`,
                entity,
                201
            );
        } catch (error) {
            logger.error({ error, data }, `Error creating ${this.entityName}`);
            return ServiceResponseBuilder.internalError<T>(
                `Failed to create ${this.entityName}`
            );
        }
    }

    /**
     * Update entity with version check
     */
    async updateWithVersionCheck(
        id: string,
        version: number,
        data: any
    ): Promise<ServiceResponse<T>> {
        try {
            const entity = await this.repository.updateWithVersionCheck(
                id,
                version,
                data
            );

            if (!entity) {
                logger.warn(
                    { id, version },
                    `${this.entityName} update failed: version mismatch or not found`
                );
                return ServiceResponseBuilder.conflict<T>(
                    'Version conflict detected or record not found'
                );
            }

            return ServiceResponseBuilder.success(
                `${this.entityName} updated successfully`,
                entity
            );
        } catch (error) {
            logger.error({ error, id, version }, `Error updating ${this.entityName}`);
            return ServiceResponseBuilder.internalError<T>(
                `Failed to update ${this.entityName}`
            );
        }
    }

    /**
     * Soft delete entity with version check
     */
    async deleteWithVersionCheck(
        id: string,
        version: number
    ): Promise<ServiceResponse<T>> {
        try {
            const entity = await this.repository.softDeleteWithVersionCheck(
                id,
                version
            );

            if (!entity) {
                logger.warn(
                    { id, version },
                    `${this.entityName} delete failed: version mismatch or not found`
                );
                return ServiceResponseBuilder.conflict<T>(
                    'Version conflict detected or record not found'
                );
            }

            return ServiceResponseBuilder.success(
                `${this.entityName} deleted successfully`,
                entity
            );
        } catch (error) {
            logger.error({ error, id, version }, `Error deleting ${this.entityName}`);
            return ServiceResponseBuilder.internalError<T>(
                `Failed to delete ${this.entityName}`
            );
        }
    }
}
