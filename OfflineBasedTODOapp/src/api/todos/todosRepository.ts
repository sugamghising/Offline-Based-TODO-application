import { BaseRepository } from '@/base';
import type { Todo } from '@/types/models';

/**
 * TodosRepository
 * Handles all database operations for Todo entities.
 * Extends BaseRepository for common CRUD operations.
 */
export class TodosRepository extends BaseRepository<Todo> {
    protected modelName = 'todo' as const;

    /**
     * Find todos by status (excluding soft-deleted)
     */
    async findByStatus(status: string): Promise<Todo[]> {
        return await this.model.findMany({
            where: {
                status,
                deletedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Get all todos including deleted ones (for admin purposes)
     */
    async findAllIncludingDeleted(): Promise<Todo[]> {
        return await this.model.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
