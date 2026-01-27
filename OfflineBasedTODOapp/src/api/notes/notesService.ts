import logger from '@/logger';
import { BaseService } from '@/base';
import { ServiceResponseBuilder, type ServiceResponse } from '@/utils';
import { NotesRepository } from './notesRepository';
import type { CreateNoteDTO, UpdateNoteDTO, Note } from '@/types/models';

/**
 * NotesService
 * Business logic layer for Note operations.
 * Extends BaseService for common service patterns.
 */
export class NotesService extends BaseService<Note> {
    protected repository: NotesRepository;
    protected entityName = 'Note';

    constructor(notesRepo: NotesRepository = new NotesRepository()) {
        super();
        this.repository = notesRepo;
    }

    /**
     * Create a new note
     */
    async createNote(dto: CreateNoteDTO): Promise<ServiceResponse<Note>> {
        try {
            const note = await this.repository.create({
                title: dto.title,
                content: dto.content,
            });

            logger.info({ noteId: note.id }, 'Note created successfully');
            return ServiceResponseBuilder.success('Note created successfully', note, 201);
        } catch (error) {
            logger.error({ error, dto }, 'Error creating note');
            return ServiceResponseBuilder.internalError<Note>('Failed to create note');
        }
    }

    /**
     * Update note with version check
     */
    async updateNote(
        id: string,
        dto: UpdateNoteDTO
    ): Promise<ServiceResponse<Note>> {
        try {
            const { version, ...updateData } = dto;

            const note = await this.repository.updateWithVersionCheck(
                id,
                version,
                updateData
            );

            if (!note) {
                logger.warn({
                    id,
                    version,
                }, 'Note update failed: version mismatch or not found');
                return ServiceResponseBuilder.conflict<Note>(
                    'Version conflict: Note has been modified by another client'
                );
            }

            logger.info({ noteId: id, newVersion: note.version }, 'Note updated successfully');
            return ServiceResponseBuilder.success('Note updated successfully', note);
        } catch (error) {
            logger.error({ error, id, dto }, 'Error updating note');
            return ServiceResponseBuilder.internalError<Note>('Failed to update note');
        }
    }

    /**
     * Delete note (soft delete with version check)
     */
    async deleteNote(id: string, version: number): Promise<ServiceResponse<Note>> {
        try {
            const note = await this.repository.softDeleteWithVersionCheck(id, version);

            if (!note) {
                logger.warn({
                    id,
                    version,
                }, 'Note delete failed: version mismatch or not found');
                return ServiceResponseBuilder.conflict<Note>(
                    'Version conflict: Note has been modified by another client'
                );
            }

            logger.info({ noteId: id }, 'Note deleted successfully');
            return ServiceResponseBuilder.success('Note deleted successfully', note);
        } catch (error) {
            logger.error({ error, id, version }, 'Error deleting note');
            return ServiceResponseBuilder.internalError<Note>('Failed to delete note');
        }
    }

    /**
     * Search notes
     */
    async searchNotes(query: string): Promise<ServiceResponse<Note[]>> {
        try {
            const notes = await this.repository.search(query);
            return ServiceResponseBuilder.success('Notes fetched successfully', notes);
        } catch (error) {
            logger.error({ error, query }, 'Error searching notes');
            return ServiceResponseBuilder.internalError<Note[]>('Failed to search notes');
        }
    }
}
