/**
 * Note Service
 * 
 * Business logic layer for Note operations.
 */

import { NoteRepository, CreateNoteData, UpdateNoteData } from '../repositories/NoteRepository';
import { OutboxService } from '../sync/OutboxService';
import { Note } from '../db/schema';
import { logger } from '../utils/logger';

export class NoteService {
    private repository = new NoteRepository();
    private outboxService = new OutboxService();

    /**
     * Create a new note
     */
    async createNote(data: CreateNoteData): Promise<Note> {
        // 1. Write to local database FIRST
        const note = await this.repository.createNote(data);

        // 2. Queue for sync
        await this.outboxService.queueCreate('notes', note.id, note);

        logger.info('NoteService', `Created note: ${note.id}`);
        return note;
    }

    /**
     * Update a note
     */
    async updateNote(id: string, data: UpdateNoteData): Promise<Note> {
        // 1. Update local database
        const note = await this.repository.updateNote(id, data);

        // 2. Queue for sync
        await this.outboxService.queueUpdate('notes', id, note);

        logger.info('NoteService', `Updated note: ${id}`);
        return note;
    }

    /**
     * Delete a note (soft delete)
     */
    async deleteNote(id: string): Promise<void> {
        // Get current state before deleting
        const note = await this.repository.findById(id);
        if (!note) {
            throw new Error(`Note not found: ${id}`);
        }

        // 1. Soft delete in local database
        await this.repository.softDelete(id);

        // 2. Queue for sync
        await this.outboxService.queueDelete('notes', id, {
            ...note,
            deletedAt: new Date().toISOString(),
        });

        logger.info('NoteService', `Deleted note: ${id}`);
    }

    /**
     * Get all notes
     */
    async getAllNotes(): Promise<Note[]> {
        return this.repository.findAll();
    }

    /**
     * Get note by ID
     */
    async getNoteById(id: string): Promise<Note | null> {
        return this.repository.findById(id);
    }

    /**
     * Search notes
     */
    async searchNotes(query: string): Promise<Note[]> {
        return this.repository.search(query);
    }

    /**
     * Get recent notes
     */
    async getRecentNotes(limit: number = 10): Promise<Note[]> {
        return this.repository.getRecent(limit);
    }
}
