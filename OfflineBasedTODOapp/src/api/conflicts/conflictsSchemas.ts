import { z } from 'zod';

// ===== Conflict Status =====

export const ConflictStatusSchema = z.enum(['PENDING', 'RESOLVED', 'DISMISSED']);

// ===== Resolution Schemas =====

export const ResolveConflictSchema = z.object({
    resolvedData: z.record(z.string(), z.any()).optional(),
    resolution: z.enum(['CLIENT', 'SERVER', 'CUSTOM']),
});

// ===== Filter Schema =====

export const ConflictFilterSchema = z.object({
    status: ConflictStatusSchema.optional(),
    tableName: z.enum(['todos', 'notes']).optional(),
});

// ===== Type Exports =====

export type ConflictStatus = z.infer<typeof ConflictStatusSchema>;
export type ResolveConflictDTO = z.infer<typeof ResolveConflictSchema>;
export type ConflictFilter = z.infer<typeof ConflictFilterSchema>;
