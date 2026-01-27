# Project Structure & Architecture

## Complete Folder Structure

```
D:\OfflineBasedTODOapp\
│
├── prisma/
│   ├── schema.prisma                    # Database schema with versioning
│   └── migrations/                      # Database migrations
│       ├── 20260119160502_init/
│       ├── 20260119161517_add_todo_conflict_table/
│       └── 20260126160350_add_notes_and_indexes/
│
├── src/
│   ├── index.ts                         # Application entry point
│   ├── logger.ts                        # Pino logger configuration
│   │
│   ├── base/                            # 🔧 BASE MODULE (Generic classes)
│   │   ├── BaseRepository.ts            # Generic CRUD with version checks
│   │   ├── BaseService.ts               # Common service patterns
│   │   └── index.ts                     # Module exports
│   │
│   ├── api/
│   │   │
│   │   ├── todos/                       # 📝 TODOS MODULE
│   │   │   ├── todosRepository.ts       # Database access layer
│   │   │   ├── todosService.ts          # Business logic layer
│   │   │   ├── todosController.ts       # HTTP request handlers
│   │   │   ├── todosRouter.ts           # Express routes
│   │   │   ├── todosSchemas.ts          # Zod validation schemas
│   │   │   └── todosTypes.ts            # TypeScript types
│   │   │
│   │   ├── notes/                       # 📄 NOTES MODULE
│   │   │   ├── notesRepository.ts       # Database access layer
│   │   │   ├── notesService.ts          # Business logic layer
│   │   │   ├── notesController.ts       # HTTP request handlers
│   │   │   ├── notesRouter.ts           # Express routes
│   │   │   └── notesSchemas.ts          # Zod validation schemas
│   │   │
│   │   ├── sync/                        # 🔄 SYNC MODULE (Core feature)
│   │   │   ├── syncRepository.ts        # Batch operations & conflict storage
│   │   │   ├── syncService.ts           # Sync logic & conflict detection
│   │   │   ├── syncController.ts        # Batch sync endpoint
│   │   │   ├── syncRouter.ts            # Sync routes
│   │   │   └── syncSchemas.ts           # Operation validation schemas
│   │   │
│   │   └── conflicts/                   # ⚠️  CONFLICTS MODULE
│   │       ├── conflictsRepository.ts   # Conflict data access
│   │       ├── conflictsService.ts      # Resolution logic
│   │       ├── conflictsController.ts   # Conflict management endpoints
│   │       ├── conflictsRouter.ts       # Conflict routes
│   │       └── conflictsSchemas.ts      # Resolution validation
│   │
│   ├── database/
│   │   └── prisma.ts                    # Prisma client instance
│   │
│   ├── generated/
│   │   └── prisma/                      # Auto-generated Prisma types
│   │
│   ├── routes/
│   │   └── registerRoutes.ts            # Central route registration
│   │
│   └── utils/
│       ├── index.ts                     # Utility exports
│       └── serviceResponse.ts           # Standard response builder
│
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript configuration
├── README.md                            # Project documentation
├── EXAMPLES.md                          # API usage examples
└── .env                                 # Environment variables
```

## Architecture Layers

### 1. Repository Layer (Data Access)

**Responsibility**: Direct database interaction only

**Pattern**: Extends `BaseRepository<T>`

**Example**: [todosRepository.ts](src/api/todos/todosRepository.ts#L1-L35)

```typescript
export class TodosRepository extends BaseRepository<Todo> {
  protected modelName = "todo" as const;

  async findByStatus(status: string): Promise<Todo[]> {
    return await this.model.findMany({
      where: { status, deletedAt: null },
    });
  }
}
```

**Key Methods from BaseRepository**:

- `findById(id)` - Get single record
- `findAll()` - Get all non-deleted records
- `create(data)` - Create with version = 1
- `updateWithVersionCheck(id, version, data)` - Version-safe update
- `softDeleteWithVersionCheck(id, version)` - Version-safe soft delete

---

### 2. Service Layer (Business Logic)

**Responsibility**: Business rules, validation, orchestration

**Pattern**: Extends `BaseService<T>`

**Example**: [todosService.ts](src/api/todos/todosService.ts#L1-L95)

```typescript
export class TodosService extends BaseService<Todo> {
  protected repository: TodosRepository;
  protected entityName = "Todo";

  async updateTodo(
    id: string,
    dto: UpdateTodoDTO,
  ): Promise<ServiceResponse<Todo>> {
    const { version, ...updateData } = dto;
    const todo = await this.repository.updateWithVersionCheck(
      id,
      version,
      updateData,
    );

    if (!todo) {
      return ServiceResponseBuilder.conflict("Version conflict detected");
    }

    return ServiceResponseBuilder.success("Todo updated successfully", todo);
  }
}
```

**Key Responsibilities**:

- Input validation
- Business logic execution
- Error handling
- Logging
- Response formatting

---

### 3. Controller Layer (HTTP Handling)

**Responsibility**: HTTP request/response handling

**Example**: [todosController.ts](src/api/todos/todosController.ts#L1-L109)

```typescript
export class TodosController {
  updateTodo = async (req: Request, res: Response): Promise<Response> => {
    try {
      const dto: UpdateTodoDTO = UpdateTodoSchema.parse(req.body);
      const serviceResponse = await this.todosService.updateTodo(
        req.params.id,
        dto,
      );
      return handleServiceResponse(res, serviceResponse);
    } catch (error) {
      return handleServiceResponse(
        res,
        ServiceResponseBuilder.validationError("Invalid data"),
      );
    }
  };
}
```

**Key Responsibilities**:

- Parse request params/body/query
- Validate with Zod schemas
- Call service methods
- Return HTTP responses

---

### 4. Router Layer (Route Definition)

**Responsibility**: Define endpoints and connect to controllers

**Example**: [todosRouter.ts](src/api/todos/todosRouter.ts#L1-L24)

```typescript
const router = Router();

router.get("/", todosController.getAllTodos);
router.get("/:id", todosController.getTodoById);
router.post("/", todosController.createTodo);
router.put("/:id", todosController.updateTodo);
router.delete("/:id", todosController.deleteTodo);

export default router;
```

---

## Data Flow

### Standard CRUD Request Flow

```
Client Request
    ↓
Express Middleware (JSON parsing, CORS, logging)
    ↓
Router (todosRouter.ts) - Matches route
    ↓
Controller (todosController.ts) - Validates with Zod
    ↓
Service (todosService.ts) - Business logic
    ↓
Repository (todosRepository.ts) - Database query
    ↓
Prisma - Executes SQL
    ↓
PostgreSQL Database
    ↓
Response flows back up the chain
```

### Sync Operation Flow

```
Client sends batch operations
    ↓
syncController.sync() - Validates with SyncRequestSchema
    ↓
syncService.processSyncOperations() - Processes each operation
    ↓
For each operation:
    ├─ CREATE: syncRepository.createRecord()
    ├─ UPDATE: Check version → Apply or create conflict
    └─ DELETE: Check version → Apply or create conflict
    ↓
Returns array of OperationResult
    ├─ APPLIED: Operation succeeded
    ├─ CONFLICT: Version mismatch, conflict created
    └─ ERROR: Operation failed
```

## Module Design Principles

### DRY (Don't Repeat Yourself)

✅ **BaseRepository** eliminates duplicate CRUD code
✅ **BaseService** provides common patterns
✅ **ServiceResponseBuilder** standardizes responses

### SOLID Principles

**Single Responsibility**:

- Repository: Only database access
- Service: Only business logic
- Controller: Only HTTP handling

**Open/Closed**:

- Base classes can be extended without modification
- New modules follow same pattern

**Liskov Substitution**:

- Any class extending BaseRepository can be used interchangeably

**Interface Segregation**:

- Clean interfaces between layers

**Dependency Inversion**:

- Services depend on abstractions (BaseRepository)

### Separation of Concerns

```
┌─────────────────────────────────────────┐
│  HTTP Layer (Router + Controller)      │
├─────────────────────────────────────────┤
│  Business Logic (Service)               │
├─────────────────────────────────────────┤
│  Data Access (Repository)               │
├─────────────────────────────────────────┤
│  ORM (Prisma)                           │
├─────────────────────────────────────────┤
│  Database (PostgreSQL)                  │
└─────────────────────────────────────────┘
```

## Version Management Strategy

### Optimistic Locking

Every record has a `version` field:

1. **Create**: version = 1
2. **Update**: version++
3. **Delete**: version++ (soft delete)

### Conflict Detection Algorithm

```typescript
// UPDATE scenario
if (serverRecord.version !== clientVersion) {
  // CONFLICT: Create conflict record
  createConflict({
    serverData: serverRecord,
    clientData: clientSubmittedData,
    serverVersion: serverRecord.version,
    clientVersion: clientVersion,
  });
  return { status: "CONFLICT" };
}

// Versions match - apply update
updateAndIncrementVersion(data);
return { status: "APPLIED" };
```

## Error Handling Strategy

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Validation error
- **404**: Not found
- **409**: Conflict (version mismatch)
- **500**: Internal server error

### ServiceResponse Pattern

All service methods return:

```typescript
interface ServiceResponse<T> {
  success: boolean;
  message: string;
  responseObject?: T;
  statusCode: number;
}
```

### Logging Strategy

Using Pino for structured logging:

```typescript
logger.info({ todoId, newVersion }, "Todo updated successfully");
logger.warn({ conflictId, serverVersion, clientVersion }, "Conflict detected");
logger.error({ error, operation }, "Error processing operation");
```

## Database Schema Patterns

### Versioning Pattern

```prisma
model Todo {
    version   Int       @default(1)  // Incremented on every change
}
```

### Soft Delete Pattern

```prisma
model Todo {
    deletedAt DateTime?  // Null = active, Set = deleted
    @@index([deletedAt])
}
```

### Conflict Storage Pattern

```prisma
model Conflict {
    serverData    Json  // Full server record
    clientData    Json  // Client's attempted change
    serverVersion Int   // For comparison
    clientVersion Int   // For comparison
    resolvedData  Json? // Final resolution choice
}
```

## Testing Strategy

### Unit Tests (Recommended)

- Test services with mocked repositories
- Test repositories with test database
- Test controllers with mocked services

### Integration Tests

- Test full API endpoints
- Test sync scenarios
- Test conflict resolution

### Example Test Scenarios

1. **Happy Path**: Create → Update → Delete with correct versions
2. **Conflict Path**: Two clients update same record
3. **Resolution Path**: Resolve conflict with CLIENT/SERVER/CUSTOM
4. **Batch Sync**: Multiple operations with mixed results

## Extending the System

### Adding a New Entity (e.g., "Tags")

1. **Update Prisma Schema**:

```prisma
model Tag {
    id        String    @id @default(uuid())
    name      String
    version   Int       @default(1)
    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    deletedAt DateTime?
}
```

2. **Create Module**: `src/api/tags/`
   - `tagsRepository.ts` (extends BaseRepository)
   - `tagsService.ts` (extends BaseService)
   - `tagsController.ts`
   - `tagsRouter.ts`
   - `tagsSchemas.ts`

3. **Register Routes**: Add to [registerRoutes.ts](src/routes/registerRoutes.ts)

4. **Update Sync**: Add 'tags' to [syncSchemas.ts](src/api/sync/syncSchemas.ts) TableNameSchema

## Performance Considerations

### Database Indexes

✅ Added on `deletedAt` for filtering
✅ Added on `Conflict.status` for queries
✅ Added on `Conflict.tableName, recordId` for lookups
✅ Unique index on `Conflict.operationId` for idempotency

### Batch Limits

- Max 100 operations per sync request
- Configurable in [syncSchemas.ts](src/api/sync/syncSchemas.ts)

### Connection Pooling

Prisma handles connection pooling automatically

## Security Considerations

### Input Validation

✅ Zod schemas validate all inputs
✅ Type safety with TypeScript
✅ Prisma prevents SQL injection

### Authentication (TODO)

- [ ] Add JWT middleware
- [ ] User ownership checks
- [ ] Rate limiting

### Authorization (TODO)

- [ ] Role-based access control
- [ ] Resource ownership validation

---

**Questions or Issues?**
See [README.md](README.md) for setup and [EXAMPLES.md](EXAMPLES.md) for API examples.
