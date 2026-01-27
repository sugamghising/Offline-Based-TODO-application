import logger from '@/logger';
import { BaseService } from '@/base';
import { ServiceResponseBuilder, type ServiceResponse } from '@/utils';
import { TodosRepository } from './todosRepository';
import type { CreateTodoDTO, UpdateTodoDTO, Todo } from '@/types/models';

/**
 * TodosService
 * Business logic layer for Todo operations.
 * Extends BaseService for common service patterns.
 */
export class TodosService extends BaseService<Todo> {
    protected repository: TodosRepository;
    protected entityName = 'Todo';

    constructor(todosRepo: TodosRepository = new TodosRepository()) {
        super();
        this.repository = todosRepo;
    }

    /**
     * Create a new todo
     */
    async createTodo(dto: CreateTodoDTO): Promise<ServiceResponse<Todo>> {
        try {
            const todo = await this.repository.create({
                title: dto.title,
                content: dto.content,
                status: dto.status || 'pending',
            });

            logger.info({ todoId: todo.id }, 'Todo created successfully');
            return ServiceResponseBuilder.success('Todo created successfully', todo, 201);
        } catch (error) {
            logger.error({ error, dto }, 'Error creating todo');
            return ServiceResponseBuilder.internalError<Todo>('Failed to create todo');
        }
    }

    /**
     * Update todo with version check
     */
    async updateTodo(
        id: string,
        dto: UpdateTodoDTO
    ): Promise<ServiceResponse<Todo>> {
        try {
            const { version, ...updateData } = dto;

            const todo = await this.repository.updateWithVersionCheck(
                id,
                version,
                updateData
            );

            if (!todo) {
                logger.warn({
                    id,
                    version,
                }, 'Todo update failed: version mismatch or not found');
                return ServiceResponseBuilder.conflict<Todo>(
                    'Version conflict: Todo has been modified by another client'
                );
            }

            logger.info({ todoId: id, newVersion: todo.version }, 'Todo updated successfully');
            return ServiceResponseBuilder.success('Todo updated successfully', todo);
        } catch (error) {
            logger.error({ error, id, dto }, 'Error updating todo');
            return ServiceResponseBuilder.internalError<Todo>('Failed to update todo');
        }
    }

    /**
     * Delete todo (soft delete with version check)
     */
    async deleteTodo(id: string, version: number): Promise<ServiceResponse<Todo>> {
        try {
            const todo = await this.repository.softDeleteWithVersionCheck(id, version);

            if (!todo) {
                logger.warn({
                    id,
                    version,
                }, 'Todo delete failed: version mismatch or not found');
                return ServiceResponseBuilder.conflict<Todo>(
                    'Version conflict: Todo has been modified by another client'
                );
            }

            logger.info({ todoId: id }, 'Todo deleted successfully');
            return ServiceResponseBuilder.success('Todo deleted successfully', todo);
        } catch (error) {
            logger.error({ error, id, version }, 'Error deleting todo');
            return ServiceResponseBuilder.internalError<Todo>('Failed to delete todo');
        }
    }

    /**
     * Get todos by status
     */
    async getTodosByStatus(status: string): Promise<ServiceResponse<Todo[]>> {
        try {
            const todos = await this.repository.findByStatus(status);
            return ServiceResponseBuilder.success('Todos fetched successfully', todos);
        } catch (error) {
            logger.error({ error, status }, 'Error fetching todos by status');
            return ServiceResponseBuilder.internalError<Todo[]>('Failed to fetch todos');
        }
    }
}
