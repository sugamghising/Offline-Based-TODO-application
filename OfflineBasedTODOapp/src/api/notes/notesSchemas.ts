import { z } from 'zod';

// ===== Request Schemas =====

export const CreateNoteSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().optional(),
});

export const UpdateNoteSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    content: z.string().optional(),
    version: z.number().int().positive('Version must be positive'),
});

export const DeleteNoteSchema = z.object({
    version: z.number().int().positive('Version must be positive'),
});

// ===== Type Exports =====

export type CreateNoteDTO = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteDTO = z.infer<typeof UpdateNoteSchema>;
export type DeleteNoteDTO = z.infer<typeof DeleteNoteSchema>;
