import { Router } from 'express';
import { syncController } from './syncController';

const router = Router();

/**
 * Sync Routes
 * Handles batch operations from offline clients
 */

// GET /api/sync/health - Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/sync - Process batch of operations
router.post('/', syncController.sync);

export default router;
