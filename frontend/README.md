# Offline-First Todo/Notes Frontend

A production-ready **offline-first web application** built with React, TypeScript, and SQLite (WASM). Works seamlessly with the offline-first backend, providing a robust sync mechanism with conflict resolution.

## 🌟 Key Features

✅ **Fully Offline** - Works without internet connection  
✅ **Local SQLite Database** - Data persists in browser via WASM  
✅ **Automatic Sync** - Syncs changes when network is available  
✅ **Conflict Resolution** - Handles merge conflicts gracefully  
✅ **Optimistic UI** - Instant updates, no waiting  
✅ **Queue Management** - Operations queued in outbox  
✅ **Network Detection** - Auto-sync on reconnection

---

## 🏗️ Architecture

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **sql.js** - SQLite WASM for browser
- **Vite** - Build tool and dev server
- **Native Fetch API** - HTTP client

### Project Structure

```
src/
├── db/                      # Database layer
│   ├── schema.ts           # SQLite table definitions
│   └── sqlite.ts           # Database manager (singleton)
│
├── repositories/            # Data access layer
│   ├── BaseRepository.ts   # Generic CRUD operations
│   ├── TodoRepository.ts   # Todo-specific queries
│   ├── NoteRepository.ts   # Note-specific queries
│   ├── OutboxRepository.ts # Outbox queue management
│   └── ConflictRepository.ts # Conflict storage
│
├── services/               # Business logic layer
│   ├── TodoService.ts      # Todo operations + outbox
│   └── NoteService.ts      # Note operations + outbox
│
├── sync/                   # Sync engine
│   ├── SyncEngine.ts       # Main sync coordinator
│   ├── OutboxService.ts    # Outbox queue service
│   └── ConflictService.ts  # Conflict handling
│
├── utils/                  # Utilities
│   ├── apiClient.ts        # HTTP API client
│   └── networkDetector.ts  # Network status monitor
│
├── ui/                     # React components
│   ├── App.tsx            # Root component
│   ├── Header.tsx         # Header with sync controls
│   ├── TodoList.tsx       # Todo management
│   ├── NoteList.tsx       # Note management
│   └── ConflictResolver.tsx # Conflict resolution UI
│
├── main.tsx               # Application entry point
└── styles.css             # Global styles
```

---

## 🗄️ Local Database Schema

### Tables

#### `todos`

```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);
```

#### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);
```

#### `outbox`

```sql
CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  operationId TEXT UNIQUE NOT NULL,
  entity TEXT NOT NULL,           -- 'todos' | 'notes'
  entityId TEXT NOT NULL,
  action TEXT NOT NULL,            -- 'CREATE' | 'UPDATE' | 'DELETE'
  payload TEXT NOT NULL,           -- JSON string
  createdAt TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  retryCount INTEGER NOT NULL DEFAULT 0,
  lastError TEXT
);
```

#### `conflicts`

```sql
CREATE TABLE conflicts (
  id TEXT PRIMARY KEY,
  operationId TEXT UNIQUE NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT NOT NULL,
  serverData TEXT NOT NULL,        -- JSON string
  clientData TEXT NOT NULL,        -- JSON string
  serverVersion INTEGER NOT NULL,
  clientVersion INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  createdAt TEXT NOT NULL,
  resolvedAt TEXT
);
```

---

## 🔄 Offline-First Flow

### Write Operations (CREATE/UPDATE/DELETE)

```
User Action → SQLite Write → Outbox Queue → UI Update (Instant!)
                                ↓
                        [When Online]
                                ↓
                          Sync Engine
                                ↓
                    POST /api/sync (batch)
                                ↓
                          Server Response
                         ↙           ↘
                    APPLIED        CONFLICT
                        ↓               ↓
                Mark as synced    Store conflict
                Update version    Show in UI
```

### Example: Creating a Todo

```typescript
// 1. User clicks "Create Todo"
await todoService.createTodo({ title: "Buy milk" });

// Behind the scenes:
// a) Write to SQLite todos table
// b) Add to outbox table
// c) UI updates immediately (optimistic)

// 2. When online, sync engine runs:
const pendingOps = await outboxService.getPendingOperations();
await apiClient.sync(pendingOps);

// 3. Server responds:
// - APPLIED → mark outbox entry as synced
// - CONFLICT → store in conflicts table, notify user
```

---

## 🔀 Sync Engine

### Triggers

The sync engine runs in these scenarios:

1. **App Start** - Initial sync on load
2. **Network Reconnect** - Auto-sync when connection restored
3. **Manual Sync** - User clicks "Sync Now" button
4. **Auto Sync** - Periodic sync every 30 seconds (configurable)

### Process

```typescript
async sync() {
  // 1. Check if online
  if (!networkDetector.isOnline) return;

  // 2. Get pending operations from outbox
  const pending = await outboxService.getPendingOperations();

  // 3. Batch send to server
  const response = await apiClient.sync(pending);

  // 4. Process each result
  for (const result of response.results) {
    if (result.status === 'APPLIED') {
      // Success! Mark as synced
      await outboxService.markAsSynced(result.operationId);
    } else if (result.status === 'CONFLICT') {
      // Conflict! Store for manual resolution
      await conflictService.storeConflict(result.data);
    }
  }
}
```

---

## ⚠️ Conflict Resolution

### Detection

Conflicts occur when:

- Local version doesn't match server version
- Someone else modified the same record
- Network delay caused stale data

### Resolution UI

The app provides a side-by-side comparison:

```
┌─────────────────────┬─────────────────────┐
│  Server Version     │  Your Version       │
├─────────────────────┼─────────────────────┤
│ Title: "Buy milk"   │ Title: "Buy bread"  │
│ Status: completed   │ Status: pending     │
│ Version: 3          │ Version: 2          │
└─────────────────────┴─────────────────────┘

   [Keep Server]  [Keep Mine]
```

### Resolution Options

1. **Keep Server Version** - Discard local changes
2. **Keep Client Version** - Override server data
3. **Custom Merge** - (Future: manual field selection)

### Code Example

```typescript
// User clicks "Keep Mine"
await conflictService.resolveConflict({
  conflictId: conflict.id,
  resolution: "CLIENT",
});

// Behind the scenes:
// 1. Send resolution to server: PUT /api/conflicts/:id/resolve
// 2. Mark local conflict as RESOLVED
// 3. Remove from outbox
// 4. Update local record with final version
```

---

## 📡 Network Detection

### Implementation

```typescript
class NetworkDetector {
  private listeners = new Set<NetworkListener>();

  constructor() {
    window.addEventListener("online", () => {
      this.notifyListeners(true);
      syncEngine.sync(); // Auto-sync!
    });

    window.addEventListener("offline", () => {
      this.notifyListeners(false);
    });
  }
}
```

### Usage

```typescript
// In components
networkDetector.addListener((isOnline) => {
  setConnectionStatus(isOnline);
});
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Backend running on `http://localhost:3000`

### Installation

```bash
cd frontend
pnpm install
```

### Configuration

Create `.env` file:

```bash
VITE_API_URL=http://localhost:3000/api
```

### Development

```bash
pnpm dev
```

Open http://localhost:5173

### Build

```bash
pnpm build
```

---

## 🧪 Testing Offline Functionality

### Scenario 1: Create Todo Offline

1. Open app
2. Open DevTools → Network tab
3. Set to "Offline"
4. Create a new todo → ✅ Works instantly!
5. Check outbox: 1 pending operation
6. Go back "Online"
7. Wait for auto-sync → Todo synced to server

### Scenario 2: Handle Conflict

1. Open app in two tabs (Tab A, Tab B)
2. Edit same todo in Tab A → "Buy milk"
3. Edit same todo in Tab B → "Buy bread"
4. Sync Tab A → ✅ Applied
5. Sync Tab B → ⚠️ Conflict!
6. Resolve conflict in Tab B → Choose one version

### Scenario 3: Persistent Offline Storage

1. Create todos offline
2. Close browser completely
3. Reopen app
4. Todos still there! (SQLite in localStorage)
5. Connect to network
6. Auto-sync happens

---

## 🔧 Key Design Decisions

### 1. SQLite in Browser (via WASM)

**Why?** Full SQL capabilities, transactions, indexes, and persistence via localStorage.

**Alternative:** IndexedDB (more complex API, no SQL)

### 2. Outbox Pattern

**Why?** Reliable queue for operations, retry logic, idempotency.

**Key:** Every write goes to outbox FIRST, then syncs later.

### 3. Optimistic UI

**Why?** Instant feedback, feels native, no waiting for network.

**Trade-off:** Occasional rollback needed (conflicts).

### 4. Version-Based Conflict Detection

**Why?** Simple, reliable, server-authoritative.

**How:** Every update increments version number.

### 5. Manual Conflict Resolution

**Why?** User decides what's correct, no data loss.

**Trade-off:** Requires user intervention.

---

## 🎯 Edge Cases Handled

✅ **App crashes before sync** - Outbox persists, syncs on next launch  
✅ **Partial sync success** - Each operation tracked independently  
✅ **Duplicate sync retries** - Idempotent operations (UUID)  
✅ **Multiple updates offline** - All queued, synced in order  
✅ **Delete conflicted record** - Conflict resolver shows deletion  
✅ **Network timeout** - Retry with exponential backoff  
✅ **Browser storage full** - Graceful degradation (error message)

---

## 📊 Performance Considerations

- **Batch Sync** - Max 100 operations per request
- **Lazy Loading** - Only active data loaded
- **Indexes** - Fast queries on status, deletedAt
- **Transactions** - Atomic operations for consistency
- **Debouncing** - Auto-sync throttled to 30s intervals

---

## 🔐 Security Notes

- ⚠️ No authentication implemented (add JWT/OAuth)
- ⚠️ No encryption at rest (add Web Crypto API)
- ⚠️ CORS configured for localhost only
- ✅ Prepared statements prevent SQL injection
- ✅ Input validation on client and server

---

## 🐛 Troubleshooting

### "Failed to initialize database"

- Clear localStorage
- Check sql.js CDN availability
- Try hard refresh (Ctrl+Shift+R)

### "Sync failed"

- Verify backend is running
- Check network tab for errors
- Inspect outbox table for failed operations

### "Conflict not resolving"

- Check server logs
- Verify conflict exists on server
- Try manual sync

---

## 📚 Resources

- [sql.js Documentation](https://sql.js.org/)
- [Offline-First Patterns](https://offlinefirst.org/)
- [Backend Repository](../OfflineBasedTODOapp)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Follow TypeScript style guide
4. Add tests for new features
5. Submit pull request

---

## 📄 License

MIT License - See backend repository for details

---

## 🎉 Summary

This frontend is a **production-ready offline-first application** that:

- ✅ Works completely offline
- ✅ Syncs automatically when online
- ✅ Handles conflicts gracefully
- ✅ Provides instant UI feedback
- ✅ Persists data reliably
- ✅ Scales to thousands of operations

**Key Takeaway:** The app NEVER blocks on network. All writes go to local SQLite first, then sync happens in the background. This creates a fast, reliable user experience even with poor connectivity.
