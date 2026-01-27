import { Router } from 'express';
import { notesController } from './notesController';

const router: ReturnType<typeof Router> = Router();

/**
 * Notes Routes
 * All routes are version-aware and support offline-first sync
 */

// GET /api/notes - Get all notes
router.get('/', notesController.getAllNotes);

// GET /api/notes/search - Search notes
router.get('/search', notesController.searchNotes);

// GET /api/notes/:id - Get single note
router.get('/:id', notesController.getNoteById);

// POST /api/notes - Create new note
router.post('/', notesController.createNote);

// PUT /api/notes/:id - Update note (requires version)
router.put('/:id', notesController.updateNote);

// DELETE /api/notes/:id - Soft delete note (requires version)
router.delete('/:id', notesController.deleteNote);

export default router;
