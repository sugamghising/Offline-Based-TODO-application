import type { Request, Response } from 'express';
import { handleServiceResponse, ServiceResponseBuilder } from '@/utils';
import { TodosService } from './todosService';
import {
    CreateTodoSchema,
    UpdateTodoSchema,
    DeleteTodoSchema,
    type CreateTodoDTO,
    type UpdateTodoDTO,
} from './todosSchemas';
import logger from '@/logger';

/**
 * TodosController
 * HTTP request handler for Todo endpoints.
 * Validates input and delegates to service layer.
 */
export class TodosController {
    private todosService: TodosService;

    constructor() {
        this.todosService = new TodosService();
    }

    /**
     * GET /api/todos/:id
     * Get a single todo by ID
     */
    getTodoById = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params as { id: string };
        const serviceResponse = await this.todosService.getById(id);
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * GET /api/todos
     * Get all todos (excluding soft-deleted)
     */
    getAllTodos = async (_req: Request, res: Response): Promise<Response> => {
        const serviceResponse = await this.todosService.getAll();
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * POST /api/todos
     * Create a new todo
     */
    createTodo = async (req: Request, res: Response): Promise<Response> => {
        try {
            const dto: CreateTodoDTO = CreateTodoSchema.parse(req.body);
            logger.info({ dto }, 'Creating new todo');

            const serviceResponse = await this.todosService.createTodo(dto);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error creating todo');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid todo data', error)
            );
        }
    };

    /**
     * PUT /api/todos/:id
     * Update a todo (with version check)
     */
    updateTodo = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params as { id: string };
            const dto: UpdateTodoDTO = UpdateTodoSchema.parse(req.body);
            logger.info({ id, dto }, 'Updating todo');

            const serviceResponse = await this.todosService.updateTodo(id, dto);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error updating todo');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid update data', error)
            );
        }
    };

    /**
     * DELETE /api/todos/:id
     * Soft delete a todo (with version check)
     */
    deleteTodo = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params as { id: string };
            const { version } = DeleteTodoSchema.parse(req.body);
            logger.info({ id, version }, 'Deleting todo');

            const serviceResponse = await this.todosService.deleteTodo(id, version);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error deleting todo');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid delete data', error)
            );
        }
    };

    /**
     * GET /api/todos/status/:status
     * Get todos by status
     */
    getTodosByStatus = async (req: Request, res: Response): Promise<Response> => {
        const { status } = req.params as { status: string };
        const serviceResponse = await this.todosService.getTodosByStatus(status);
        return handleServiceResponse(res, serviceResponse);
    };
}

export const todosController = new TodosController();