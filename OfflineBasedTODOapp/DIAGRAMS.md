# System Flow Diagrams

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Local SQLite │  │    UI/UX     │  │ Sync Manager │          │
│  │   Database   │←→│   Interface  │←→│   (Outbox)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                          OFFLINE ────────┤──────── ONLINE
                                          │
                                          ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    API ROUTES                          │    │
│  │  /api/todos  /api/notes  /api/sync  /api/conflicts    │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  CONTROLLERS                           │    │
│  │  HTTP Request Handlers + Zod Validation               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    SERVICES                            │    │
│  │  Business Logic + Conflict Detection                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                 REPOSITORIES                           │    │
│  │  Database Access Layer (Prisma)                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────┬───────────────────────────┘
                                      ↓
                        ┌──────────────────────────┐
                        │   POSTGRESQL DATABASE    │
                        │  ┌───────┐ ┌───────┐    │
                        │  │ Todos │ │ Notes │    │
                        │  └───────┘ └───────┘    │
                        │      ┌───────────┐      │
                        │      │ Conflicts │      │
                        │      └───────────┘      │
                        └──────────────────────────┘
```

## 2. Sync Operation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT (Offline Work)                          │
│                                                                   │
│  1. User creates/edits todos/notes locally                       │
│  2. Operations stored in outbox queue:                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ operationId: uuid-1                                 │     │
│     │ action: CREATE                                       │     │
│     │ table: todos                                         │     │
│     │ data: { id, title, content, version }               │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                   │
│  3. When online, send batch to server                            │
│                                                                   │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │ POST /api/sync
                                 │ { operations: [...] }
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                      SERVER PROCESSING                            │
│                                                                   │
│  For each operation:                                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ACTION: CREATE                                          │    │
│  │   → Insert with version = 1                             │    │
│  │   → Return APPLIED                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ACTION: UPDATE                                          │    │
│  │   1. Fetch server record                                │    │
│  │   2. Compare versions                                   │    │
│  │      ┌─ IF versions match:                              │    │
│  │      │    → Apply update                                │    │
│  │      │    → Increment version                           │    │
│  │      │    → Return APPLIED                              │    │
│  │      │                                                   │    │
│  │      └─ IF version mismatch:                            │    │
│  │           → Create conflict record                      │    │
│  │           → Store server + client data                  │    │
│  │           → Return CONFLICT with conflictId             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ACTION: DELETE                                          │    │
│  │   1. Fetch server record                                │    │
│  │   2. Compare versions                                   │    │
│  │      ┌─ IF versions match:                              │    │
│  │      │    → Soft delete (set deletedAt)                 │    │
│  │      │    → Increment version                           │    │
│  │      │    → Return APPLIED                              │    │
│  │      │                                                   │    │
│  │      └─ IF version mismatch:                            │    │
│  │           → Create conflict record                      │    │
│  │           → Return CONFLICT with conflictId             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Return to client:                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ {                                                       │    │
│  │   results: [                                            │    │
│  │     { operationId, status: "APPLIED", data: {...} },   │    │
│  │     { operationId, status: "CONFLICT", conflictId },   │    │
│  │     { operationId, status: "ERROR", message }          │    │
│  │   ],                                                    │    │
│  │   summary: { total, applied, conflicts, errors }       │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                CLIENT PROCESSES RESPONSE                          │
│                                                                   │
│  For APPLIED operations:                                         │
│    → Update local database                                       │
│    → Remove from outbox                                          │
│    → Sync version number                                         │
│                                                                   │
│  For CONFLICT operations:                                        │
│    → Show notification to user                                   │
│    → Present conflict resolution UI                              │
│    → Keep operation in outbox                                    │
│                                                                   │
│  For ERROR operations:                                           │
│    → Log error                                                   │
│    → Retry later or alert user                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Conflict Resolution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                USER DETECTS CONFLICT                              │
│                                                                   │
│  Client receives: { status: "CONFLICT", conflictId: "abc-123" }  │
│                                                                   │
│  Step 1: Fetch conflict details                                  │
│          GET /api/conflicts/abc-123                              │
└────────────────────────────────┬─────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                SERVER RETURNS CONFLICT DATA                       │
│                                                                   │
│  {                                                               │
│    "serverData": {                                               │
│      "id": "todo-123",                                           │
│      "title": "Buy milk",        ← Server version               │
│      "status": "completed",                                      │
│      "version": 3                                                │
│    },                                                            │
│    "clientData": {                                               │
│      "id": "todo-123",                                           │
│      "title": "Buy groceries",   ← Client version               │
│      "status": "pending",                                        │
│      "version": 2                                                │
│    },                                                            │
│    "serverVersion": 3,                                           │
│    "clientVersion": 2                                            │
│  }                                                               │
└────────────────────────────────┬─────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                    USER REVIEWS CONFLICT                          │
│                                                                   │
│  UI Shows Side-by-Side Comparison:                              │
│                                                                   │
│  ┌─────────────────────┬─────────────────────┐                  │
│  │   SERVER VERSION    │   CLIENT VERSION    │                  │
│  ├─────────────────────┼─────────────────────┤                  │
│  │ Buy milk            │ Buy groceries       │                  │
│  │ Completed           │ Pending             │                  │
│  │ Version 3           │ Version 2           │                  │
│  └─────────────────────┴─────────────────────┘                  │
│                                                                   │
│  User chooses resolution:                                        │
│  ┌─────────────────────────────────────────────┐                │
│  │  ○ Keep Server Version                      │                │
│  │  ○ Keep Client Version                      │                │
│  │  ● Create Custom Merge                      │                │
│  │                                             │                │
│  │  Title: [Buy milk and groceries]           │                │
│  │  Status: [completed]                        │                │
│  │                                             │                │
│  │         [Resolve Conflict]                  │                │
│  └─────────────────────────────────────────────┘                │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │ PUT /api/conflicts/abc-123/resolve
                                 │ {
                                 │   resolution: "CUSTOM",
                                 │   resolvedData: {
                                 │     title: "Buy milk and groceries",
                                 │     status: "completed"
                                 │   }
                                 │ }
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                SERVER APPLIES RESOLUTION                          │
│                                                                   │
│  Using Transaction:                                              │
│                                                                   │
│  1. Update original record (todos/notes table)                   │
│     ┌──────────────────────────────────────────────┐            │
│     │ UPDATE todos                                 │            │
│     │ SET title = "Buy milk and groceries",        │            │
│     │     status = "completed",                    │            │
│     │     version = version + 1                    │            │
│     │ WHERE id = "todo-123"                        │            │
│     └──────────────────────────────────────────────┘            │
│                                                                   │
│  2. Update conflict record                                       │
│     ┌──────────────────────────────────────────────┐            │
│     │ UPDATE conflicts                             │            │
│     │ SET status = "RESOLVED",                     │            │
│     │     resolvedData = {...},                    │            │
│     │     resolvedAt = NOW()                       │            │
│     │ WHERE id = "abc-123"                         │            │
│     └──────────────────────────────────────────────┘            │
│                                                                   │
│  3. Return success                                               │
│     ┌──────────────────────────────────────────────┐            │
│     │ {                                            │            │
│     │   success: true,                             │            │
│     │   message: "Conflict resolved",              │            │
│     │   data: {                                    │            │
│     │     id: "todo-123",                          │            │
│     │     title: "Buy milk and groceries",         │            │
│     │     status: "completed",                     │            │
│     │     version: 4  ← Incremented               │            │
│     │   }                                          │            │
│     │ }                                            │            │
│     └──────────────────────────────────────────────┘            │
└────────────────────────────────┬─────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────┐
│                CLIENT UPDATES LOCAL DATABASE                      │
│                                                                   │
│  1. Update local record with resolved data                       │
│  2. Update version to 4                                          │
│  3. Remove operation from outbox                                 │
│  4. Show success notification                                    │
│                                                                   │
│  ✅ Conflict resolved and data synchronized!                     │
└──────────────────────────────────────────────────────────────────┘
```

## 4. Version Conflict Scenario

```
TIME →

T1: Server State                T2: Client A (offline)        T3: Client B (online)
┌──────────────┐                ┌──────────────┐             ┌──────────────┐
│ Todo: ABC    │                │ Todo: ABC    │             │ Todo: ABC    │
│ Title: "A"   │                │ Title: "A"   │             │ Title: "A"   │
│ Version: 1   │                │ Version: 1   │             │ Version: 1   │
└──────────────┘                └──────────────┘             └──────────────┘
                                       │                            │
                                       │                            │
                                       │ User edits                 │ User edits
                                       │ (offline)                  │ (online)
                                       ↓                            ↓
                                ┌──────────────┐             ┌──────────────┐
                                │ Title: "B"   │             │ Title: "C"   │
                                │ Version: 1   │             │ Version: 1   │
                                │ (in outbox)  │             │              │
                                └──────────────┘             └──────────────┘
                                                                    │
                                                                    │ Syncs to server
                                                                    ↓
                                                             ┌──────────────┐
                                                             │ Server State │
                                                             │ Title: "C"   │
                                                             │ Version: 2 ✓ │
                                                             └──────────────┘
                                       │
                                       │ Goes online, syncs
                                       ↓
                                ┌─────────────────────────────────┐
                                │ UPDATE with version 1 (old!)    │
                                │ ❌ CONFLICT DETECTED!           │
                                │                                 │
                                │ serverVersion: 2 ≠ clientVersion: 1 │
                                └─────────────────────────────────┘
                                       ↓
                                ┌─────────────────────────────────┐
                                │ Conflict Record Created         │
                                │                                 │
                                │ serverData: { title: "C", v: 2 } │
                                │ clientData: { title: "B", v: 1 } │
                                │ status: PENDING                 │
                                └─────────────────────────────────┘
                                       ↓
                                ┌─────────────────────────────────┐
                                │ User resolves manually          │
                                │ Final title: "B and C"          │
                                │ Version: 3                      │
                                └─────────────────────────────────┘
```

## 5. Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                        BASE MODULE                          │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ BaseRepository<T>│         │ BaseService<T>   │        │
│  │                  │         │                  │        │
│  │ - findById()     │         │ - getById()      │        │
│  │ - findAll()      │         │ - getAll()       │        │
│  │ - create()       │         │ - create()       │        │
│  │ - updateWith     │         │ - updateWith     │        │
│  │   VersionCheck() │         │   VersionCheck() │        │
│  └──────────────────┘         └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
           ↑                               ↑
           │                               │
           │ extends                       │ extends
           │                               │
┌──────────┴───────────┬──────────────────┴─────────────────┐
│                      │                                     │
│  TODOS MODULE        │  NOTES MODULE      SYNC MODULE     │
│                      │                                     │
│  ┌────────────┐      │  ┌────────────┐   ┌────────────┐  │
│  │TodosRepo   │      │  │NotesRepo   │   │SyncRepo    │  │
│  ├────────────┤      │  ├────────────┤   ├────────────┤  │
│  │TodosService│      │  │NotesService│   │SyncService │  │
│  ├────────────┤      │  ├────────────┤   ├────────────┤  │
│  │TodosCtrl   │      │  │NotesCtrl   │   │SyncCtrl    │  │
│  └────────────┘      │  └────────────┘   └────────────┘  │
│                      │                                     │
└──────────────────────┴─────────────────────────────────────┘
                       │
                       │ uses for conflict creation
                       ↓
           ┌─────────────────────────┐
           │   CONFLICTS MODULE      │
           │                         │
           │  ┌────────────────┐     │
           │  │ConflictsRepo   │     │
           │  ├────────────────┤     │
           │  │ConflictsService│     │
           │  ├────────────────┤     │
           │  │ConflictsCtrl   │     │
           │  └────────────────┘     │
           └─────────────────────────┘
```

## 6. Request/Response Flow

```
HTTP Request
     │
     ↓
┌─────────────────────┐
│  Express Middleware │
│  - CORS             │
│  - JSON Parser      │
│  - Logger           │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Router             │
│  - Match route      │
│  - Extract params   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Controller         │
│  - Parse request    │
│  - Validate (Zod)   │  ──→  Validation Error (400)
│  - Call service     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Service            │
│  - Business logic   │
│  - Error handling   │  ──→  Business Error (404/409/500)
│  - Call repository  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Repository         │
│  - Build query      │
│  - Call Prisma      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Prisma ORM         │
│  - Generate SQL     │
│  - Execute query    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  PostgreSQL         │
│  - Execute SQL      │
│  - Return results   │
└──────────┬──────────┘
           ↓
  Results bubble back up
           ↓
┌─────────────────────┐
│  Service Response   │
│  {                  │
│    success: bool    │
│    message: string  │
│    data: T          │
│    statusCode: num  │
│  }                  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  HTTP Response      │
│  Status + JSON body │
└─────────────────────┘
```

---

These diagrams visualize the complete system architecture and data flow.
