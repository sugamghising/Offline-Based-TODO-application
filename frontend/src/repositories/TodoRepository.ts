/**
 * Todo Repository
 * 
 * Handles all database operations for Todo items.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Todo } from '../db/schema';
import { db } from '../db/sqlite';

export interface CreateTodoData {
    title: string;
    content?: string;
    status?: 'pending' | 'in-progress' | 'completed';
}

export interface UpdateTodoData {
    title?: string;
    content?: string;
    status?: 'pending' | 'in-progress' | 'completed';
}

export class TodoRepository extends BaseRepository<Todo> {
    constructor() {
        super('todos');
    }

    /**
     * Create a new todo with generated ID and timestamps
     */
    async createTodo(data: CreateTodoData): Promise<Todo> {
        const now = new Date().toISOString();
        const todo: Partial<Todo> = {
            id: uuidv4(),
            title: data.title,
            content: data.content || null,
            status: data.status || 'pending',
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };

        return this.create(todo);
    }

    /**
     * Update a todo and increment version
     */
    async updateTodo(id: string, data: UpdateTodoData): Promise<Todo> {
        // First, get current version
        const current = await this.findById(id);
        if (!current) {
            throw new Error(`Todo not found: ${id}`);
        }

        const now = new Date().toISOString();
        const updateData: Partial<Todo> = {
            ...data,
            version: current.version + 1,
            updatedAt: now,
        };

        return this.update(id, updateData);
    }

    /**
     * Find todos by status
     */
    async findByStatus(status: 'pending' | 'in-progress' | 'completed'): Promise<Todo[]> {
        return db.query<Todo>(
            `SELECT * FROM todos WHERE status = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`,
            [status]
        );
    }

    /**
     * Search todos by title or content
     */
    async search(query: string): Promise<Todo[]> {
        const searchPattern = `%${query}%`;
        return db.query<Todo>(
            `SELECT * FROM todos 
       WHERE (title LIKE ? OR content LIKE ?) 
       AND deletedAt IS NULL 
       ORDER BY updatedAt DESC`,
            [searchPattern, searchPattern]
        );
    }

    /**
     * Get statistics
     */
    async getStats() {
        const result = await db.query<{ status: string; count: number }>(
            `SELECT status, COUNT(*) as count 
       FROM todos 
       WHERE deletedAt IS NULL 
       GROUP BY status`
        );

        const stats = {
            pending: 0,
            'in-progress': 0,
            completed: 0,
            total: 0,
        };

        result.forEach((row) => {
            stats[row.status as keyof typeof stats] = row.count;
            stats.total += row.count;
        });

        return stats;
    }
}
