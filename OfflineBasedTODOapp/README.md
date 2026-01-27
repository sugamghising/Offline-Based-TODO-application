# Offline-First Todo/Notes Backend

A production-ready backend for an offline-first Todo/Notes application built with Node.js, TypeScript, Express, PostgreSQL, and Prisma. Supports batch sync operations with automatic conflict detection and manual resolution.

## 🏗️ Architecture

### Modular OOP Design

The application follows a clean, modular architecture with separation of concerns:

```
src/
├── base/                    # Shared base classes
│   ├── BaseRepository.ts    # Generic CRUD operations
│   └── BaseService.ts       # Common business logic patterns
├── api/
│   ├── todos/              # Todo module
│   │   ├── todosRepository.ts
│   │   ├── todosService.ts
│   │   ├── todosController.ts
│   │   ├── todosRouter.ts
│   │   └── todosSchemas.ts
│   ├── notes/              # Notes module (same structure)
│   ├── sync/               # Sync operations
│   └── conflicts/          # Conflict management
├── database/               # Prisma client
├── routes/                 # Route registration
└── utils/                  # Shared utilities
```

### Key Design Patterns

- **Repository Pattern**: Data access layer abstraction
- **Service Layer**: Business logic separation
- **Controller Layer**: HTTP request handling
- **Generic Base Classes**: DRY principle implementation
- **Zod Validation**: Type-safe request validation

## 🔄 Offline-First Sync Flow

### How It Works

1. **Client Side**: Users work offline with local SQLite database
2. **Operation Queue**: Client tracks all CREATE/UPDATE/DELETE operations
3. **Batch Sync**: When online, client sends batch of operations to server
4. **Conflict Detection**: Server checks versions and detects conflicts
5. **Manual Resolution**: User resolves conflicts through API

### Sync Operation Example

```json
POST /api/sync
{
  "operations": [
    {
      "operationId": "550e8400-e29b-41d4-a716-446655440000",
      "action": "CREATE",
      "table": "todos",
      "data": {
        "id": "123",
        "title": "Buy groceries",
        "content": "Milk, eggs, bread",
        "status": "pending"
      }
    },
    {
      "operationId": "550e8400-e29b-41d4-a716-446655440001",
      "action": "UPDATE",
      "table": "todos",
      "data": {
        "id": "456",
        "version": 2,
        "title": "Updated title",
        "status": "completed"
      }
    }
  ]
}
```

### Response Format

```json
{
  "success": true,
  "message": "Sync completed",
  "data": {
    "results": [
      {
        "operationId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "APPLIED",
        "message": "Record created successfully",
        "data": { ...createdRecord }
      },
      {
        "operationId": "550e8400-e29b-41d4-a716-446655440001",
        "status": "CONFLICT",
        "message": "Version conflict detected",
        "conflictId": "789"
      }
    ],
    "summary": {
      "total": 2,
      "applied": 1,
      "conflicts": 1,
      "errors": 0
    }
  }
}
```

## 📦 Database Schema

### Versioned Entities

Both `Todo` and `Note` use the same versioning pattern:

```prisma
model Todo {
  id        String    @id @default(uuid())
  title     String
  content   String?
  status    String    @default("pending")
  version   Int       @default(1)      // Optimistic locking
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?                  // Soft delete
}
```

### Conflict Records

```prisma
model Conflict {
  id            String    @id @default(uuid())
  operationId   String    @unique        // Idempotency key
  tableName     String                   // "todos" | "notes"
  recordId      String                   // ID of conflicted record
  serverData    Json                     // Current server state
  clientData    Json                     // Client's attempted change
  serverVersion Int                      // Server's version
  clientVersion Int                      // Client's version
  status        String    @default("PENDING")
  resolvedAt    DateTime?
  resolvedData  Json?                    // Resolution choice
  createdAt     DateTime  @default(now())
}
```

## 🛠️ API Endpoints

### Todos

```
GET    /api/todos              # Get all todos
GET    /api/todos/:id          # Get single todo
GET    /api/todos/status/:s    # Filter by status
POST   /api/todos              # Create todo
PUT    /api/todos/:id          # Update todo (requires version)
DELETE /api/todos/:id          # Soft delete (requires version)
```

### Notes

```
GET    /api/notes              # Get all notes
GET    /api/notes/:id          # Get single note
GET    /api/notes/search?q=    # Search notes
POST   /api/notes              # Create note
PUT    /api/notes/:id          # Update note (requires version)
DELETE /api/notes/:id          # Soft delete (requires version)
```

### Sync

```
POST   /api/sync               # Process batch operations
```

### Conflicts

```
GET    /api/conflicts          # Get all conflicts
GET    /api/conflicts/stats    # Get statistics
GET    /api/conflicts/:id      # Get single conflict
PUT    /api/conflicts/:id/resolve   # Resolve conflict
PUT    /api/conflicts/:id/dismiss   # Dismiss conflict
```

## 🔧 Conflict Resolution

### Resolution Types

1. **CLIENT**: Accept client's changes
2. **SERVER**: Keep server's state
3. **CUSTOM**: Manually merged data

### Resolution Example

```json
PUT /api/conflicts/:id/resolve
{
  "resolution": "CUSTOM",
  "resolvedData": {
    "id": "456",
    "title": "Merged title",
    "content": "Merged content",
    "status": "completed"
  }
}
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/todoapp"
PORT=3000
NODE_ENV=development
```

### 3. Run Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Server

```bash
pnpm dev
```

### 5. Build for Production

```bash
pnpm build
pnpm start
```

## 📝 Example Usage

### Create a Todo

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Prisma",
    "content": "Study the documentation",
    "status": "pending"
  }'
```

### Update with Version Check

```bash
curl -X PUT http://localhost:3000/api/todos/123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "version": 1
  }'
```

### Batch Sync

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operationId": "uuid-1",
        "action": "CREATE",
        "table": "todos",
        "data": {
          "id": "new-id",
          "title": "New todo",
          "status": "pending"
        }
      }
    ]
  }'
```

## ⚙️ Version Conflict Detection

### When Conflicts Occur

1. **UPDATE**: Server version ≠ client version
2. **UPDATE**: Record doesn't exist on server
3. **DELETE**: Server version ≠ client version

### Conflict Workflow

```
Client sends UPDATE with version 3
↓
Server has version 5 (someone else updated)
↓
Server creates Conflict record
↓
Returns CONFLICT status with conflictId
↓
User reviews both versions
↓
User resolves via /conflicts/:id/resolve
↓
Server applies resolution and increments version
```

## 🧪 Testing Conflicts

### Simulate Version Mismatch

```bash
# 1. Create a todo
POST /api/todos -> returns version 1

# 2. Update it once
PUT /api/todos/:id with version 1 -> returns version 2

# 3. Try to update with old version
PUT /api/todos/:id with version 1 -> returns 409 CONFLICT
```

## 🎯 Key Features

✅ **Optimistic Locking**: Version-based conflict detection  
✅ **Soft Deletes**: Records never truly deleted  
✅ **Idempotency**: Operation IDs prevent duplicate processing  
✅ **Batch Operations**: Process up to 100 operations at once  
✅ **Manual Resolution**: Full control over conflict resolution  
✅ **Type Safety**: Zod validation + TypeScript  
✅ **Structured Logging**: Pino for production-ready logs  
✅ **Modular Architecture**: Easy to extend with new entities

## 📚 Project Structure Explanation

### Base Module

Generic classes that avoid code duplication:

- `BaseRepository<T>`: CRUD operations with version checks
- `BaseService<T>`: Common business logic patterns

### Feature Modules

Each feature (todos, notes) extends base classes:

- **Repository**: Database access only
- **Service**: Business logic + validation
- **Controller**: HTTP request handling
- **Router**: Route definitions
- **Schemas**: Zod validation schemas

### Sync Module

Specialized module for batch operations:

- Processes operations sequentially
- Detects version conflicts
- Creates conflict records
- Returns per-operation results

### Conflicts Module

Manages conflict lifecycle:

- List/filter conflicts
- View conflict details
- Resolve with CLIENT/SERVER/CUSTOM
- Dismiss without changes

## 🔒 Production Considerations

### Security

- [ ] Add authentication/authorization
- [ ] Rate limiting on sync endpoint
- [ ] Input sanitization
- [ ] SQL injection prevention (Prisma handles this)

### Performance

- [ ] Database indexing (already added)
- [ ] Connection pooling
- [ ] Batch operation limits (max 100)
- [ ] Caching layer for reads

### Monitoring

- [ ] Health check endpoint (✅ implemented)
- [ ] Metrics collection
- [ ] Error tracking (Sentry, etc.)
- [ ] Structured logging (✅ Pino)

## 📄 License

MIT

---

**Built with ❤️ using TypeScript, Express, Prisma, and PostgreSQL**
