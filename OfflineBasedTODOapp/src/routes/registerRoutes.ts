import type { Express } from 'express';
import todosRouter from '@/api/todos/todosRouter';
import notesRouter from '@/api/notes/notesRouter';
import syncRouter from '@/api/sync/syncRouter';
import conflictsRouter from '@/api/conflicts/conflictsRouter';
import logger from '@/logger';

/**
 * Register all API routes
 * Modular route registration for clean separation of concerns
 */
export function registerRoutes(app: Express): void {
    // API version prefix
    const API_PREFIX = '/api';

    // Register module routes
    app.use(`${API_PREFIX}/todos`, todosRouter);
    app.use(`${API_PREFIX}/notes`, notesRouter);
    app.use(`${API_PREFIX}/sync`, syncRouter);
    app.use(`${API_PREFIX}/conflicts`, conflictsRouter);

    logger.info('All routes registered successfully');
}
