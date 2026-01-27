import { prisma } from '@/database/prisma';
import type { Conflict } from '@/types/models';
import type { ConflictStatus } from './conflictsSchemas';

/**
 * ConflictsRepository
 * Handles database operations for conflict records.
 */
export class ConflictsRepository {
    /**
     * Find all conflicts with optional filters
     */
    async findAll(
        status?: ConflictStatus,
        tableName?: string
    ): Promise<Conflict[]> {
        return await prisma.conflict.findMany({
            where: {
                ...(status && { status }),
                ...(tableName && { tableName }),
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Find conflict by ID
     */
    async findById(id: string): Promise<Conflict | null> {
        return await prisma.conflict.findUnique({
            where: { id },
        });
    }

    /**
     * Resolve a conflict
     */
    async resolve(
        id: string,
        resolvedData: any
    ): Promise<Conflict | null> {
        try {
            return await prisma.conflict.update({
                where: { id },
                data: {
                    status: 'RESOLVED',
                    resolvedData,
                    resolvedAt: new Date(),
                },
            });
        } catch (error) {
            return null;
        }
    }

    /**
     * Dismiss a conflict
     */
    async dismiss(id: string): Promise<Conflict | null> {
        try {
            return await prisma.conflict.update({
                where: { id },
                data: {
                    status: 'DISMISSED',
                    resolvedAt: new Date(),
                },
            });
        } catch (error) {
            return null;
        }
    }

    /**
     * Get pending conflict count by table
     */
    async getPendingCountByTable(): Promise<Record<string, number>> {
        const counts = await prisma.conflict.groupBy({
            by: ['tableName'],
            where: {
                status: 'PENDING',
            },
            _count: true,
        });

        return counts.reduce((acc, item) => {
            acc[item.tableName] = item._count;
            return acc;
        }, {} as Record<string, number>);
    }
}
