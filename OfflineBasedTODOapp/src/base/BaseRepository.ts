import { prisma } from '@/database/prisma';
// PrismaClient type from generated path
type PrismaClient = typeof prisma;

/**
 * BaseRepository<T>
 * Generic base repository providing common CRUD operations.
 * Implements soft delete pattern and version-aware updates.
 * 
 * @template T - The entity type this repository manages
 */
export abstract class BaseRepository<T> {
    protected abstract modelName: keyof PrismaClient;

    /**
     * Get model delegate for Prisma operations
     */
    protected get model(): any {
        return (prisma as any)[this.modelName];
    }

    /**
     * Find a single record by ID (excludes soft-deleted records)
     */
    async findById(id: string): Promise<T | null> {
        return await this.model.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
    }

    /**
     * Find a single record by ID (includes soft-deleted records)
     */
    async findByIdIncludingDeleted(id: string): Promise<T | null> {
        return await this.model.findUnique({
            where: { id },
        });
    }

    /**
     * Find all records (excludes soft-deleted)
     */
    async findAll(): Promise<T[]> {
        return await this.model.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Create a new record with version = 1
     */
    async create(data: any): Promise<T> {
        return await this.model.create({
            data: {
                ...data,
                version: 1,
            },
        });
    }

    /**
     * Update a record with version check
     * Returns null if version mismatch or record not found
     */
    async updateWithVersionCheck(
        id: string,
        currentVersion: number,
        data: any
    ): Promise<T | null> {
        try {
            return await this.model.update({
                where: {
                    id,
                    version: currentVersion,
                    deletedAt: null,
                },
                data: {
                    ...data,
                    version: {
                        increment: 1,
                    },
                },
            });
        } catch (error) {
            // Record not found or version mismatch
            return null;
        }
    }

    /**
     * Soft delete a record with version check
     * Returns null if version mismatch or record not found
     */
    async softDeleteWithVersionCheck(
        id: string,
        currentVersion: number
    ): Promise<T | null> {
        try {
            return await this.model.update({
                where: {
                    id,
                    version: currentVersion,
                    deletedAt: null,
                },
                data: {
                    deletedAt: new Date(),
                    version: {
                        increment: 1,
                    },
                },
            });
        } catch (error) {
            return null;
        }
    }

    /**
     * Update without version check (used for conflict resolution)
     */
    async updateWithoutVersionCheck(id: string, data: any): Promise<T> {
        return await this.model.update({
            where: { id },
            data: {
                ...data,
                version: {
                    increment: 1,
                },
            },
        });
    }

    /**
     * Get current version of a record
     */
    async getVersion(id: string): Promise<number | null> {
        const record = await this.model.findUnique({
            where: { id },
            select: { version: true },
        });
        return record?.version ?? null;
    }
}
