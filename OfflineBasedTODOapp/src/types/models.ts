/**
 * TypeScript type definitions for database models
 * These types mirror the Prisma schema for type safety across the application
 */

/**
 * Todo model type definition
 */
export interface Todo {
    id: string;
    title: string;
    content?: string | null;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

/**
 * Note model type definition
 */
export interface Note {
    id: string;
    title: string;
    content?: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

/**
 * Conflict model type definition
 */
export interface Conflict {
    id: string;
    operationId: string;
    tableName: string;
    recordId: string;
    serverData: any;
    clientData: any;
    serverVersion: number;
    clientVersion: number;
    status: string;
    resolvedAt?: Date | null;
    resolvedData?: any | null;
    createdAt: Date;
}

/**
 * Data Transfer Object for creating a Todo
 */
export interface CreateTodoDTO {
    title: string;
    content?: string | null | undefined;
    status?: string | undefined;
}

/**
 * Data Transfer Object for updating a Todo
 */
export interface UpdateTodoDTO {
    version: number;
    title?: string | undefined;
    content?: string | null | undefined;
    status?: string | undefined;
}

/**
 * Data Transfer Object for creating a Note
 */
export interface CreateNoteDTO {
    title: string;
    content?: string | null | undefined;
}

/**
 * Data Transfer Object for updating a Note
 */
export interface UpdateNoteDTO {
    version: number;
    title?: string | undefined;
    content?: string | null | undefined;
}

/**
 * Data Transfer Object for resolving conflicts
 */
export interface ResolveConflictDTO {
    resolution: 'CLIENT' | 'SERVER' | 'CUSTOM';
    customData?: any;
}

export type { Conflict as ConflictType };