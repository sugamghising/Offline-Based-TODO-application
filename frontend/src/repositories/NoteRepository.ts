/**
 * Note Repository
 * 
 * Handles all database operations for Note items.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Note } from '../db/schema';
import { db } from '../db/sqlite';

export interface CreateNoteData {
    title: string;
    content?: string;
}

export interface UpdateNoteData {
    title?: string;
    content?: string;
}

export class NoteRepository extends BaseRepository<Note> {
    constructor() {
        super('notes');
    }

    /**
     * Create a new note with generated ID and timestamps
     */
    async createNote(data: CreateNoteData): Promise<Note> {
        const now = new Date().toISOString();
        const note: Partial<Note> = {
            id: uuidv4(),
            title: data.title,
            content: data.content || null,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };

        return this.create(note);
    }

    /**
     * Update a note and increment version
     */
    async updateNote(id: string, data: UpdateNoteData): Promise<Note> {
        // First, get current version
        const current = await this.findById(id);
        if (!current) {
            throw new Error(`Note not found: ${id}`);
        }

        const now = new Date().toISOString();
        const updateData: Partial<Note> = {
            ...data,
            version: current.version + 1,
            updatedAt: now,
        };

        return this.update(id, updateData);
    }

    /**
     * Search notes by title or content
     */
    async search(query: string): Promise<Note[]> {
        const searchPattern = `%${query}%`;
        return db.query<Note>(
            `SELECT * FROM notes 
       WHERE (title LIKE ? OR content LIKE ?) 
       AND deletedAt IS NULL 
       ORDER BY updatedAt DESC`,
            [searchPattern, searchPattern]
        );
    }

    /**
     * Get recently updated notes
     */
    async getRecent(limit: number = 10): Promise<Note[]> {
        return db.query<Note>(
            `SELECT * FROM notes 
       WHERE deletedAt IS NULL 
       ORDER BY updatedAt DESC 
       LIMIT ?`,
            [limit]
        );
    }
}
