import type { Request, Response } from 'express';
import { handleServiceResponse, ServiceResponseBuilder } from '@/utils';
import { NotesService } from './notesService';
import {
    CreateNoteSchema,
    UpdateNoteSchema,
    DeleteNoteSchema,
    type CreateNoteDTO,
    type UpdateNoteDTO,
} from './notesSchemas';
import logger from '@/logger';

/**
 * NotesController
 * HTTP request handler for Note endpoints.
 * Validates input and delegates to service layer.
 */
export class NotesController {
    private notesService: NotesService;

    constructor() {
        this.notesService = new NotesService();
    }

    /**
     * GET /api/notes/:id
     * Get a single note by ID
     */
    getNoteById = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params as { id: string };
        const serviceResponse = await this.notesService.getById(id);
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * GET /api/notes
     * Get all notes (excluding soft-deleted)
     */
    getAllNotes = async (_req: Request, res: Response): Promise<Response> => {
        const serviceResponse = await this.notesService.getAll();
        return handleServiceResponse(res, serviceResponse);
    };

    /**
     * POST /api/notes
     * Create a new note
     */
    createNote = async (req: Request, res: Response): Promise<Response> => {
        try {
            const dto: CreateNoteDTO = CreateNoteSchema.parse(req.body);
            logger.info({ dto }, 'Creating new note');

            const serviceResponse = await this.notesService.createNote(dto);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error creating note');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid note data', error)
            );
        }
    };

    /**
     * PUT /api/notes/:id
     * Update a note (with version check)
     */
    updateNote = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params as { id: string };
            const dto: UpdateNoteDTO = UpdateNoteSchema.parse(req.body);
            logger.info({ id, dto }, 'Updating note');

            const serviceResponse = await this.notesService.updateNote(id, dto);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error updating note');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid update data', error)
            );
        }
    };

    /**
     * DELETE /api/notes/:id
     * Soft delete a note (with version check)
     */
    deleteNote = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params as { id: string };
            const { version } = DeleteNoteSchema.parse(req.body);
            logger.info({ id, version }, 'Deleting note');

            const serviceResponse = await this.notesService.deleteNote(id, version);
            return handleServiceResponse(res, serviceResponse);
        } catch (error) {
            logger.error({ error, body: req.body }, 'Validation error deleting note');
            return handleServiceResponse(
                res,
                ServiceResponseBuilder.validationError('Invalid delete data', error)
            );
        }
    };

    /**
     * GET /api/notes/search?q=query
     * Search notes by title/content
     */
    searchNotes = async (req: Request, res: Response): Promise<Response> => {
        const query = (req.query.q as string) || '';
        const serviceResponse = await this.notesService.searchNotes(query);
        return handleServiceResponse(res, serviceResponse);
    };
}

export const notesController = new NotesController();
