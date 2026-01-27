# API Examples

Complete examples for testing the offline-first backend.

## Prerequisites

Start the server:

```bash
pnpm dev
```

## 1. CRUD Operations

### Create a Todo

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "content": "Milk, eggs, bread, cheese",
    "status": "pending"
  }'
```

Response:

```json
{
  "success": true,
  "message": "Todo created successfully",
  "responseObject": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Buy groceries",
    "content": "Milk, eggs, bread, cheese",
    "status": "pending",
    "version": 1,
    "createdAt": "2026-01-26T10:00:00.000Z",
    "updatedAt": "2026-01-26T10:00:00.000Z",
    "deletedAt": null
  },
  "statusCode": 201
}
```

### Get All Todos

```bash
curl http://localhost:3000/api/todos
```

### Update Todo (Version Check)

```bash
curl -X PUT http://localhost:3000/api/todos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries - UPDATED",
    "status": "completed",
    "version": 1
  }'
```

### Delete Todo (Soft Delete)

```bash
curl -X DELETE http://localhost:3000/api/todos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "version": 2
  }'
```

## 2. Batch Sync Operations

### Successful Sync (No Conflicts)

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operationId": "op-create-1",
        "action": "CREATE",
        "table": "todos",
        "data": {
          "id": "todo-1",
          "title": "First todo",
          "content": "Created offline",
          "status": "pending"
        }
      },
      {
        "operationId": "op-create-2",
        "action": "CREATE",
        "table": "notes",
        "data": {
          "id": "note-1",
          "title": "Meeting notes",
          "content": "Discussed project timeline"
        }
      }
    ]
  }'
```

Response:

```json
{
  "success": true,
  "message": "Sync completed",
  "data": {
    "results": [
      {
        "operationId": "op-create-1",
        "status": "APPLIED",
        "message": "Record created successfully",
        "data": { ...todoRecord }
      },
      {
        "operationId": "op-create-2",
        "status": "APPLIED",
        "message": "Record created successfully",
        "data": { ...noteRecord }
      }
    ],
    "summary": {
      "total": 2,
      "applied": 2,
      "conflicts": 0,
      "errors": 0
    }
  }
}
```

## 3. Conflict Scenarios

### Scenario 1: Version Mismatch

#### Step 1: Create a todo

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Original title",
    "status": "pending"
  }'
# Save the returned ID, e.g., "abc-123"
```

#### Step 2: Update it (version becomes 2)

```bash
curl -X PUT http://localhost:3000/api/todos/abc-123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Server updated title",
    "version": 1
  }'
```

#### Step 3: Try to update with old version (simulate offline client)

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operationId": "op-conflict-1",
        "action": "UPDATE",
        "table": "todos",
        "data": {
          "id": "abc-123",
          "title": "Client updated title",
          "version": 1
        }
      }
    ]
  }'
```

Response (CONFLICT detected):

```json
{
  "success": true,
  "message": "Sync completed",
  "data": {
    "results": [
      {
        "operationId": "op-conflict-1",
        "status": "CONFLICT",
        "message": "Version conflict detected",
        "conflictId": "conflict-xyz-789"
      }
    ],
    "summary": {
      "total": 1,
      "applied": 0,
      "conflicts": 1,
      "errors": 0
    }
  }
}
```

## 4. Conflict Management

### Get All Conflicts

```bash
curl http://localhost:3000/api/conflicts
```

### Get Pending Conflicts Only

```bash
curl "http://localhost:3000/api/conflicts?status=PENDING"
```

### Get Conflict Details

```bash
curl http://localhost:3000/api/conflicts/conflict-xyz-789
```

Response:

```json
{
  "success": true,
  "message": "Conflict fetched successfully",
  "responseObject": {
    "id": "conflict-xyz-789",
    "operationId": "op-conflict-1",
    "tableName": "todos",
    "recordId": "abc-123",
    "serverData": {
      "id": "abc-123",
      "title": "Server updated title",
      "version": 2,
      ...
    },
    "clientData": {
      "id": "abc-123",
      "title": "Client updated title",
      "version": 1
    },
    "serverVersion": 2,
    "clientVersion": 1,
    "status": "PENDING",
    "resolvedAt": null,
    "resolvedData": null,
    "createdAt": "2026-01-26T10:30:00.000Z"
  },
  "statusCode": 200
}
```

### Resolve Conflict (Choose Server Version)

```bash
curl -X PUT http://localhost:3000/api/conflicts/conflict-xyz-789/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "SERVER"
  }'
```

### Resolve Conflict (Choose Client Version)

```bash
curl -X PUT http://localhost:3000/api/conflicts/conflict-xyz-789/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "CLIENT"
  }'
```

### Resolve Conflict (Custom Merge)

```bash
curl -X PUT http://localhost:3000/api/conflicts/conflict-xyz-789/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "CUSTOM",
    "resolvedData": {
      "id": "abc-123",
      "title": "Manually merged title",
      "content": "Combined the best of both",
      "status": "in-progress"
    }
  }'
```

### Dismiss Conflict

```bash
curl -X PUT http://localhost:3000/api/conflicts/conflict-xyz-789/dismiss
```

## 5. Conflict Statistics

```bash
curl http://localhost:3000/api/conflicts/stats
```

Response:

```json
{
  "success": true,
  "message": "Statistics fetched successfully",
  "responseObject": {
    "total": 10,
    "pending": 3,
    "resolved": 5,
    "dismissed": 2,
    "byTable": {
      "todos": 2,
      "notes": 1
    }
  },
  "statusCode": 200
}
```

## 6. Notes API

### Create Note

```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project Ideas",
    "content": "Build an offline-first app"
  }'
```

### Search Notes

```bash
curl "http://localhost:3000/api/notes/search?q=offline"
```

### Update Note

```bash
curl -X PUT http://localhost:3000/api/notes/note-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Project Ideas",
    "version": 1
  }'
```

## 7. Complete Workflow Example

### Simulate Offline Client Scenario

```bash
# 1. Client creates todo while offline (generates operation)
# (stored locally, not sent yet)

# 2. Another client updates the same todo on server
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Shared todo", "status": "pending"}'
# Returns: id: "shared-123", version: 1

curl -X PUT http://localhost:3000/api/todos/shared-123 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated by User B", "version": 1}'
# Server version is now 2

# 3. First client comes online and syncs with old version
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [{
      "operationId": "offline-op-1",
      "action": "UPDATE",
      "table": "todos",
      "data": {
        "id": "shared-123",
        "title": "Updated by User A",
        "version": 1
      }
    }]
  }'
# Returns: CONFLICT

# 4. User reviews conflict
curl http://localhost:3000/api/conflicts?status=PENDING

# 5. User resolves conflict with custom merge
curl -X PUT http://localhost:3000/api/conflicts/{conflictId}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "CUSTOM",
    "resolvedData": {
      "id": "shared-123",
      "title": "Merged by both users",
      "status": "in-progress"
    }
  }'
```

## 8. Error Handling Examples

### Invalid Data (400)

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": ""
  }'
# Returns 400: Title is required
```

### Not Found (404)

```bash
curl http://localhost:3000/api/todos/non-existent-id
# Returns 404: Todo not found
```

### Version Conflict (409)

```bash
curl -X PUT http://localhost:3000/api/todos/abc-123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Update",
    "version": 999
  }'
# Returns 409: Version conflict
```

---

## Testing with Postman/Insomnia

Import these examples into Postman:

1. Create a new collection "Offline-First API"
2. Add environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `todoId`: (saved from create response)
3. Use `{{baseUrl}}/api/todos/{{todoId}}` in requests

## Next Steps

- Set up automated tests
- Create client SDK for sync operations
- Implement authentication
- Add WebSocket for real-time conflict notifications
