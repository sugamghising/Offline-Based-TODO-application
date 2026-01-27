/**
 * Todo Service
 * 
 * Business logic layer for Todo operations.
 * Coordinates between UI, Repository, and Sync.
 */

import { TodoRepository, CreateTodoData, UpdateTodoData } from '../repositories/TodoRepository';
import { OutboxService } from '../sync/OutboxService';
import { Todo } from '../db/schema';
import { logger } from '../utils/logger';

export class TodoService {
    private repository = new TodoRepository();
    private outboxService = new OutboxService();

    /**
     * Create a new todo
     * CRITICAL: Write to SQLite first, then queue for sync
     */
    async createTodo(data: CreateTodoData): Promise<Todo> {
        // 1. Write to local database FIRST
        const todo = await this.repository.createTodo(data);

        // 2. Queue for sync
        await this.outboxService.queueCreate('todos', todo.id, todo);

        logger.info('TodoService', `Created todo: ${todo.id}`);
        return todo;
    }

    /**
     * Update a todo
     */
    async updateTodo(id: string, data: UpdateTodoData): Promise<Todo> {
        // 1. Update local database
        const todo = await this.repository.updateTodo(id, data);

        // 2. Queue for sync
        await this.outboxService.queueUpdate('todos', id, todo);

        logger.info('TodoService', `Updated todo: ${id}`);
        return todo;
    }

    /**
     * Delete a todo (soft delete)
     */
    async deleteTodo(id: string): Promise<void> {
        // Get current state before deleting
        const todo = await this.repository.findById(id);
        if (!todo) {
            throw new Error(`Todo not found: ${id}`);
        }

        // 1. Soft delete in local database
        await this.repository.softDelete(id);

        // 2. Queue for sync
        await this.outboxService.queueDelete('todos', id, {
            ...todo,
            deletedAt: new Date().toISOString(),
        });

        logger.info('TodoService', `Deleted todo: ${id}`);
    }

    /**
     * Get all todos
     */
    async getAllTodos(): Promise<Todo[]> {
        return this.repository.findAll();
    }

    /**
     * Get todo by ID
     */
    async getTodoById(id: string): Promise<Todo | null> {
        return this.repository.findById(id);
    }

    /**
     * Get todos by status
     */
    async getTodosByStatus(status: 'pending' | 'in-progress' | 'completed'): Promise<Todo[]> {
        return this.repository.findByStatus(status);
    }

    /**
     * Search todos
     */
    async searchTodos(query: string): Promise<Todo[]> {
        return this.repository.search(query);
    }

    /**
     * Get statistics
     */
    async getStats() {
        return this.repository.getStats();
    }
}
