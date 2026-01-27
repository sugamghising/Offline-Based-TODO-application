import { Router } from 'express';
import { conflictsController } from './conflictsController';

const router = Router();

/**
 * Conflicts Routes
 * Manage and resolve conflicts from sync operations
 */

// GET /api/conflicts - Get all conflicts (with optional filters)
router.get('/', conflictsController.getAllConflicts);

// GET /api/conflicts/stats - Get conflict statistics
router.get('/stats', conflictsController.getConflictStats);

// GET /api/conflicts/:id - Get single conflict
router.get('/:id', conflictsController.getConflictById);

// PUT /api/conflicts/:id/resolve - Resolve a conflict
router.put('/:id/resolve', conflictsController.resolveConflict);

// PUT /api/conflicts/:id/dismiss - Dismiss a conflict
router.put('/:id/dismiss', conflictsController.dismissConflict);

export default router;
