import { Router } from 'express';
import { todosController } from './todosController';

const router = Router();

/**
 * Todos Routes
 * All routes are version-aware and support offline-first sync
 */

// GET /api/todos - Get all todos
router.get('/', todosController.getAllTodos);

// GET /api/todos/status/:status - Get todos by status
router.get('/status/:status', todosController.getTodosByStatus);

// GET /api/todos/:id - Get single todo
router.get('/:id', todosController.getTodoById);

// POST /api/todos - Create new todo
router.post('/', todosController.createTodo);

// PUT /api/todos/:id - Update todo (requires version)
router.put('/:id', todosController.updateTodo);

// DELETE /api/todos/:id - Soft delete todo (requires version)
router.delete('/:id', todosController.deleteTodo);

export default router;
