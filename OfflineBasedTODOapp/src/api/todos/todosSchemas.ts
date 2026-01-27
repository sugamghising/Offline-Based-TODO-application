import { z } from 'zod';

// ===== Request Schemas =====

export const CreateTodoSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
});

export const UpdateTodoSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    content: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).optional(),
    version: z.number().int().positive('Version must be positive'),
});

export const DeleteTodoSchema = z.object({
    version: z.number().int().positive('Version must be positive'),
});

// ===== Type Exports =====

export type CreateTodoDTO = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoDTO = z.infer<typeof UpdateTodoSchema>;
export type DeleteTodoDTO = z.infer<typeof DeleteTodoSchema>;
