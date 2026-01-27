# Offline-First Todo App - Development Guide

## Quick Start Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Development Workflow

### 1. Running the Full Stack

Terminal 1 - Backend:

```bash
cd OfflineBasedTODOapp
pnpm dev
```

Terminal 2 - Frontend:

```bash
cd frontend
pnpm dev
```

Backend runs on: http://localhost:3000  
Frontend runs on: http://localhost:5173

### 2. Database Inspection

Open browser console:

```javascript
// Get database stats
const db = await (await import("./src/db/sqlite.ts")).db.getDatabase();

// Query todos
const todos = await db.exec("SELECT * FROM todos");

// Query outbox
const outbox = await db.exec("SELECT * FROM outbox");

// Query conflicts
const conflicts = await db.exec("SELECT * FROM conflicts");
```

### 3. Testing Offline Mode

**Chrome DevTools:**

1. F12 → Network tab
2. Throttling → Offline
3. Create/edit todos → Works!
4. Throttling → Online
5. Watch auto-sync happen

**Real offline test:**

1. Disconnect WiFi
2. Use app normally
3. Reconnect WiFi
4. Data syncs automatically

## Code Structure Explained

### Database Layer (`src/db/`)

- **schema.ts** - Table definitions and TypeScript interfaces
- **sqlite.ts** - Singleton database manager, handles persistence

Key concept: Database saved to localStorage on every write.

### Repository Layer (`src/repositories/`)

Pure data access. No business logic.

```typescript
// Example: TodoRepository
await todoRepository.createTodo({ title: "Buy milk" });
await todoRepository.updateTodo(id, { status: "completed" });
await todoRepository.findAll();
```

### Service Layer (`src/services/`)

Business logic + outbox integration.

```typescript
// TodoService automatically:
// 1. Writes to SQLite
// 2. Adds to outbox
// 3. Returns immediately
await todoService.createTodo({ title: "Buy milk" });
```

### Sync Layer (`src/sync/`)

**SyncEngine.ts** - Orchestrates sync process:

1. Get pending operations
2. Batch send to server
3. Process responses
4. Handle conflicts

**OutboxService.ts** - Manages operation queue

**ConflictService.ts** - Conflict storage and resolution

### UI Layer (`src/ui/`)

React components. All use hooks for state management.

**Best practices:**

- Load data in useEffect
- Listen to sync events for updates
- Show loading states
- Handle errors gracefully

## Common Tasks

### Adding a New Field to Todo

1. Update schema.ts:

```typescript
export interface Todo {
  // ... existing fields
  priority?: "low" | "medium" | "high";
}
```

2. Update database migration (schema.ts):

```sql
ALTER TABLE todos ADD COLUMN priority TEXT;
```

3. Update UI components to show/edit field

4. No sync changes needed! It just works™

### Adding a New Entity

Example: Adding "Projects"

1. Create `src/db/schema.ts` entry
2. Create `src/repositories/ProjectRepository.ts`
3. Create `src/services/ProjectService.ts`
4. Update sync schemas (entity type)
5. Create `src/ui/ProjectList.tsx`
6. Add tab in App.tsx

### Debugging Sync Issues

**Enable verbose logging:**

```typescript
// In sync/SyncEngine.ts
console.log("[Sync] Operation:", operation);
console.log("[Sync] Response:", response);
```

**Check outbox manually:**

```typescript
const outbox = new OutboxRepository();
const pending = await outbox.getPendingOperations();
console.log("Pending operations:", pending);
```

**Inspect conflicts:**

```typescript
const conflicts = new ConflictRepository();
const pending = await conflicts.getPendingConflicts();
console.log("Conflicts:", pending);
```

## Architecture Patterns

### 1. Repository Pattern

Abstracts data access. Easy to swap SQLite for IndexedDB later.

### 2. Service Layer

Coordinates between repositories and sync. Business logic lives here.

### 3. Singleton Pattern

Database and sync engine are singletons for global access.

### 4. Observer Pattern

Network detector and sync engine notify listeners of events.

### 5. Outbox Pattern

Critical for offline-first. All writes queued, synced later.

## Performance Tips

### Optimize Queries

```typescript
// ❌ Bad - Multiple queries
for (const id of ids) {
  await repo.findById(id);
}

// ✅ Good - Single query with IN clause
await db.query(`SELECT * FROM todos WHERE id IN (?, ?, ?)`, ids);
```

### Batch Operations

```typescript
// ✅ Sync batches up to 100 operations
await syncEngine.sync(); // Sends all at once
```

### Use Indexes

Already created in schema for:

- todos.deletedAt
- todos.status
- outbox.synced
- conflicts.status

## Security Checklist

- [ ] Add authentication (JWT/OAuth)
- [ ] Validate all inputs
- [ ] Sanitize user content (XSS)
- [ ] Encrypt sensitive data
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Use HTTPS in production
- [ ] Set secure headers

## Deployment

### Build for Production

```bash
pnpm build
```

Output: `dist/` folder

### Environment Variables

Production `.env`:

```bash
VITE_API_URL=https://api.yourdomain.com/api
```

### Hosting Options

- **Vercel** - Zero config, automatic deployments
- **Netlify** - Great for static sites
- **AWS S3 + CloudFront** - Scalable CDN
- **GitHub Pages** - Free for open source

### Deployment Steps

1. Build: `pnpm build`
2. Test build: `pnpm preview`
3. Deploy `dist/` folder
4. Configure API URL
5. Test offline functionality
6. Monitor errors (Sentry, etc.)

## Testing Scenarios

### Scenario: Create Todo Offline, Sync Later

1. Go offline
2. Create todo "Buy milk"
3. Check: Todo appears in UI immediately
4. Check: Outbox has 1 pending operation
5. Go online
6. Wait 30s or click "Sync Now"
7. Check: Outbox empty, todo synced

### Scenario: Conflict Resolution

1. Open two browser tabs
2. Edit same todo in both tabs
3. Tab 1: Set title = "Version A"
4. Tab 2: Set title = "Version B"
5. Sync Tab 1 → Success
6. Sync Tab 2 → Conflict!
7. Resolve conflict in Tab 2
8. Check: Final version saved

### Scenario: App Crash During Sync

1. Create todos offline
2. Close browser (simulate crash)
3. Reopen app
4. Check: Todos still there (localStorage)
5. Check: Outbox still has pending ops
6. Sync happens automatically

## Troubleshooting Guide

### Database Not Persisting

**Symptom:** Data lost on refresh

**Fix:**

- Check localStorage size (max 5-10MB)
- Clear localStorage and reinitialize
- Check browser console for errors

### Sync Not Working

**Symptom:** Outbox growing, nothing syncs

**Checklist:**

- [ ] Backend is running
- [ ] CORS configured correctly
- [ ] Network tab shows requests
- [ ] No JavaScript errors in console

### Conflicts Not Appearing

**Symptom:** Conflict should exist but UI doesn't show

**Debug:**

```typescript
const conflicts = await conflictService.getPendingConflicts();
console.log(conflicts);
```

Check:

- Conflict stored in local DB?
- Status = 'PENDING'?
- ConflictResolver component mounted?

## Best Practices

### 1. Always Use Transactions

```typescript
await db.transaction(async (db) => {
  // Multiple operations
  // All or nothing
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  await todoService.createTodo(data);
} catch (error) {
  console.error(error);
  alert("Failed to create todo. Please try again.");
}
```

### 3. Show Loading States

```typescript
const [loading, setLoading] = useState(false);

// Show spinner while loading
if (loading) return <Spinner />;
```

### 4. Optimistic UI Updates

```typescript
// Update UI immediately
setTodos([...todos, newTodo]);

// Sync happens in background
await todoService.createTodo(newTodo);
```

### 5. Clean Up Listeners

```typescript
useEffect(() => {
  const unsubscribe = syncEngine.addSyncListener(callback);
  return () => unsubscribe(); // Cleanup!
}, []);
```

## Advanced Topics

### Custom Conflict Resolution

Implement 3-way merge:

```typescript
function merge(base, client, server) {
  // Compare base → client changes
  // Compare base → server changes
  // Combine non-conflicting changes
  // Let user resolve conflicts
}
```

### Offline File Uploads

Store files as base64 in outbox:

```typescript
const base64 = await fileToBase64(file);
await outboxService.queueCreate("attachments", id, {
  file: base64,
  filename: file.name,
});
```

### Background Sync API

Use Service Worker for background sync:

```typescript
navigator.serviceWorker.ready.then((registration) => {
  return registration.sync.register("sync-todos");
});
```

## Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [sql.js API](https://sql.js.org/documentation/)
- [Offline First Principles](https://offlinefirst.org/)

## Need Help?

1. Check browser console for errors
2. Inspect network requests
3. Query database directly
4. Check backend logs
5. Open GitHub issue

---

Happy coding! 🚀
