import { BaseRepository } from '@/base';
import type { Note } from '@/types/models';

/**
 * NotesRepository
 * Handles all database operations for Note entities.
 * Extends BaseRepository for common CRUD operations.
 */
export class NotesRepository extends BaseRepository<Note> {
    protected modelName = 'note' as const;

    /**
     * Search notes by title or content
     */
    async search(query: string): Promise<Note[]> {
        return await this.model.findMany({
            where: {
                deletedAt: null,
                OR: [
                    {
                        title: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        content: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }
}
