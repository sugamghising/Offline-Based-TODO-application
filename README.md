# Offline-First TODO App

Monorepo containing a frontend SPA and a backend API for an offline-first TODO application.

Folders

- `frontend/` — React + Vite frontend that uses local SQLite (sql.js) and sync engine.
- `OfflineBasedTODOapp/` — Express + Prisma backend API.

Quick start

1. Start the backend (from repository root):

````powershell
 # Offline-First TODO App — Test & Learn

 This repository is a learning / test playground for an offline-first synchronization system. Use it to experiment with offline flows, sync behavior, conflict resolution, and how the frontend and backend recover after network/server outages.

 Overview
 - frontend/ — React + Vite SPA. Uses local SQLite (sql.js) + an outbox + `SyncEngine` to synchronize batched operations with the server.
 - OfflineBasedTODOapp/ — Express + Prisma backend API. Implements `/api/sync` endpoints, conflict detection, and idempotency tracking.

 Quick start

 1. Start the backend (separate terminal):

 ```powershell
 cd OfflineBasedTODOapp
 pnpm install
 pnpm dev
````

2.  Start the frontend (another terminal):

```powershell
cd frontend
npm install
npm run dev
```

What this repo is for

- Learning how an outbox-based offline sync works.
- Observing idempotency handling (server avoids duplicate processing).
- Testing conflict detection and manual resolution flows.

Quick manual test scenarios

1.  Normal online flow
    - With both servers running, create/edit/delete todos in the frontend — operations should sync to the backend and appear in logs.

2.  Backend down (recommended)
    - Stop the backend (`Ctrl+C`) while keeping the frontend open.
    - Make changes in the frontend (create/update/delete). Those operations are saved locally in the outbox.
    - Restart the backend — the frontend detects the backend is reachable and automatically syncs queued operations.

3.  True network offline
    - Disable network or use browser DevTools → Offline. Frontend will show Offline quickly and queue changes locally.
    - Re-enable network; frontend will check backend health and trigger sync.

4.  Conflict simulation
    - Create a record online so it exists on the server.
    - Go offline (or stop backend) and edit the same record in the frontend.
    - While offline, modify the same record directly on the server (via another client or database).
    - Bring the client back online: the server will detect a version mismatch and create a conflict entry which the frontend displays for manual resolution.

Where logs and state live

- Backend logs: `OfflineBasedTODOapp/logs/combined.log` and `OfflineBasedTODOapp/logs/error.log`.
- Frontend local DB: the frontend uses sql.js / IndexedDB (see `frontend/src/db`) and has an outbox service that stores pending operations.
- Server-side processed operations: tracked in the database (ProcessedOperation table) to guarantee idempotency.

Helpful endpoints & files

- Health check: `GET /api/sync/health` — used by the frontend to confirm backend reachability.
- Sync endpoint: `POST /api/sync` — receives batched operations from the client.
- Frontend outbox logic: `frontend/src/sync/OutboxService.ts` (or check `frontend/src/sync` folder).
- Sync engine: `frontend/src/sync/SyncEngine.ts`.
- Backend sync logic: `OfflineBasedTODOapp/src/api/sync` (see `syncService.ts`, `syncRepository.ts`, `syncRouter.ts`).

Tips for debugging

- Open the browser Console and Network tab. The `SyncEngine` logs status and results.
- Check backend logs in `OfflineBasedTODOapp/logs/` for detailed processing information.
- Use Prisma Studio or query the database to inspect `ProcessedOperation` and `Conflict` records:

```powershell
cd OfflineBasedTODOapp
npx prisma studio
```

Want more?

- I can add step-by-step scripts to automatically simulate offline scenarios, add Playwright/Cypress E2E tests for offline behavior, or create a small debugging UI to inspect the outbox and processed operations. Tell me which you'd prefer.

---

_This README is intentionally focused on testing and learning the offline sync system._
