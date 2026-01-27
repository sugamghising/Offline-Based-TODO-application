import { z } from 'zod';

// ===== Operation Types =====

export const OperationActionSchema = z.enum(['CREATE', 'UPDATE', 'DELETE']);
export const TableNameSchema = z.enum(['todos', 'notes']);

// ===== Single Operation Schema =====

export const SyncOperationSchema = z.object({
    operationId: z.string().uuid('Operation ID must be a valid UUID'),
    action: OperationActionSchema,
    table: TableNameSchema,
    data: z.record(z.string(), z.any()), // Flexible data structure
});

// ===== Batch Sync Request Schema =====

export const SyncRequestSchema = z.object({
    operations: z
        .array(SyncOperationSchema)
        .min(1, 'At least one operation is required')
        .max(100, 'Maximum 100 operations per batch'),
});

// ===== Operation Result Types =====

export const OperationStatusSchema = z.enum(['APPLIED', 'CONFLICT', 'ERROR']);

export const OperationResultSchema = z.object({
    operationId: z.string(),
    status: OperationStatusSchema,
    message: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
    conflictId: z.string().optional(), // ID of the conflict record if created
});

// ===== Type Exports =====

export type OperationAction = z.infer<typeof OperationActionSchema>;
export type TableName = z.infer<typeof TableNameSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncRequest = z.infer<typeof SyncRequestSchema>;
export type OperationStatus = z.infer<typeof OperationStatusSchema>;
export type OperationResult = z.infer<typeof OperationResultSchema>;
