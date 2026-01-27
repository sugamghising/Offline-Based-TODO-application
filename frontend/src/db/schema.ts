/**
 * SQLite Database Schema Definition
 * 
 * This schema mirrors the backend structure and adds client-specific tables
 * for offline-first operation (outbox, conflicts).
 */

export const CREATE_TABLES_SQL = `
  -- ===== TODOS TABLE =====
  -- Stores all todo items with version tracking for optimistic locking
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT,
    CHECK (status IN ('pending', 'in-progress', 'completed'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_todos_deletedAt ON todos(deletedAt);
  CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status) WHERE deletedAt IS NULL;
  
  -- ===== NOTES TABLE =====
  -- Stores all note items with version tracking
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_notes_deletedAt ON notes(deletedAt);
  
  -- ===== OUTBOX TABLE =====
  -- Tracks pending operations that need to be synced to server
  -- This is the heart of offline-first: ALL writes go here first
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    operationId TEXT UNIQUE NOT NULL,
    entity TEXT NOT NULL CHECK (entity IN ('todos', 'notes')),
    entityId TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    retryCount INTEGER NOT NULL DEFAULT 0,
    lastError TEXT,
    CHECK (synced IN (0, 1))
  );
  
  CREATE INDEX IF NOT EXISTS idx_outbox_synced ON outbox(synced);
  CREATE INDEX IF NOT EXISTS idx_outbox_entity ON outbox(entity, entityId);
  
  -- ===== CONFLICTS TABLE =====
  -- Stores conflicts returned by the server during sync
  CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    operationId TEXT UNIQUE NOT NULL,
    entity TEXT NOT NULL CHECK (entity IN ('todos', 'notes')),
    entityId TEXT NOT NULL,
    serverData TEXT NOT NULL,
    clientData TEXT NOT NULL,
    serverVersion INTEGER NOT NULL,
    clientVersion INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    createdAt TEXT NOT NULL,
    resolvedAt TEXT,
    CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
  CREATE INDEX IF NOT EXISTS idx_conflicts_entity ON conflicts(entity, entityId);
`;

export interface Todo {
    id: string;
    title: string;
    content: string | null;
    status: 'pending' | 'in-progress' | 'completed';
    version: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface Note {
    id: string;
    title: string;
    content: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface OutboxEntry {
    id: string;
    operationId: string;
    entity: 'todos' | 'notes';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: string; // JSON stringified
    createdAt: string;
    synced: 0 | 1;
    retryCount: number;
    lastError: string | null;
}

export interface Conflict {
    id: string;
    operationId: string;
    entity: 'todos' | 'notes';
    entityId: string;
    serverData: string; // JSON stringified
    clientData: string; // JSON stringified
    serverVersion: number;
    clientVersion: number;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    createdAt: string;
    resolvedAt: string | null;
}
