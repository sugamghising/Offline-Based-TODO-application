# 🚀 Quick Start Guide

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** (recommended) or npm
- **Backend** running on port 3000

## Installation Steps

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

Or with npm:

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VITE_API_URL=http://localhost:3000/api
```

### 3. Start Backend (Required)

In a separate terminal:

```bash
cd ../OfflineBasedTODOapp
pnpm install
pnpm dev
```

Backend should start on: http://localhost:3000

### 4. Start Frontend

```bash
pnpm dev
```

Frontend will start on: http://localhost:5173

### 5. Open Browser

Navigate to: http://localhost:5173

You should see:

- Header with "Online" status
- Empty todo list
- "Sync Now" button

## 🧪 Test Offline Functionality

### Test 1: Create Todo Offline

1. Open DevTools (F12)
2. Go to **Network** tab
3. Select **Offline** from throttling dropdown
4. Click **"+ New Todo"**
5. Create a todo: "Buy milk"
6. ✅ Todo appears instantly!
7. Check header: Shows "1 pending"
8. Go back **Online**
9. Wait 30 seconds or click **"Sync Now"**
10. ✅ Todo synced! "0 pending"

### Test 2: Handle Conflict

1. Open app in **two browser tabs** (Tab A, Tab B)
2. **Tab A**: Edit todo "Buy milk" → "Buy bread"
3. **Tab B**: Edit same todo "Buy milk" → "Buy eggs"
4. **Tab A**: Wait for sync → ✅ Applied
5. **Tab B**: Wait for sync → ⚠️ Conflict!
6. **Tab B**: Go to **Conflicts** tab
7. See side-by-side comparison
8. Choose **"Keep My Changes"** or **"Keep Server Version"**
9. ✅ Conflict resolved!

### Test 3: Persist Offline Data

1. Go **Offline**
2. Create 5 todos
3. **Close browser completely**
4. Reopen browser
5. Go to: http://localhost:5173
6. ✅ All 5 todos still there!
7. Go **Online**
8. ✅ Auto-sync happens

## 📁 Project Structure

```
frontend/
├── src/
│   ├── db/                 # SQLite database
│   │   ├── schema.ts       # Table definitions
│   │   └── sqlite.ts       # Database manager
│   │
│   ├── repositories/       # Data access layer
│   │   ├── TodoRepository.ts
│   │   ├── NoteRepository.ts
│   │   ├── OutboxRepository.ts
│   │   └── ConflictRepository.ts
│   │
│   ├── services/          # Business logic
│   │   ├── TodoService.ts
│   │   └── NoteService.ts
│   │
│   ├── sync/              # Sync engine
│   │   ├── SyncEngine.ts
│   │   ├── OutboxService.ts
│   │   └── ConflictService.ts
│   │
│   ├── utils/             # Utilities
│   │   ├── apiClient.ts
│   │   └── networkDetector.ts
│   │
│   ├── ui/                # React components
│   │   ├── App.tsx
│   │   ├── Header.tsx
│   │   ├── TodoList.tsx
│   │   ├── NoteList.tsx
│   │   └── ConflictResolver.tsx
│   │
│   └── main.tsx           # Entry point
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 Key Features

### ✅ Offline-First

- All operations work offline
- Data stored in SQLite (WASM)
- Persisted in localStorage

### ✅ Automatic Sync

- Syncs on app start
- Auto-sync every 30 seconds
- Manual "Sync Now" button
- Auto-sync on network reconnect

### ✅ Conflict Resolution

- Server vs Client comparison
- Side-by-side diff view
- User chooses version
- No data loss

### ✅ Optimistic UI

- Instant feedback
- No waiting for network
- Background sync

## 🔧 Common Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm tsc --noEmit

# Lint
pnpm eslint src
```

## 🐛 Troubleshooting

### Database Not Working

**Symptom:** "Failed to initialize database"

**Solution:**

```javascript
// Open DevTools Console
localStorage.clear();
location.reload();
```

### Sync Not Working

**Symptom:** Operations stay pending

**Checklist:**

- [ ] Backend is running on port 3000
- [ ] Network status shows "Online"
- [ ] No errors in console
- [ ] CORS configured correctly

**Debug:**

```javascript
// Check pending operations
const status = await syncEngine.getStatus();
console.log(status);
```

### Port Already in Use

**Symptom:** "Port 5173 is already in use"

**Solution:**

```bash
# Kill process on port
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

## 📚 Learn More

- [Full Documentation](./README.md)
- [Development Guide](./DEVELOPMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)

## 🆘 Need Help?

1. Check browser console for errors
2. Inspect network tab
3. Check backend logs
4. Query database:
   ```javascript
   // In browser console
   const db = await (await import("./src/db/sqlite.ts")).db.getDatabase();
   const todos = db.exec("SELECT * FROM todos");
   console.log(todos);
   ```

## 🎉 You're Ready!

The app is now running and ready to use. Try:

1. ✅ Create todos and notes
2. ✅ Test offline mode
3. ✅ Trigger conflicts
4. ✅ Resolve conflicts
5. ✅ Watch auto-sync work

**Key Takeaway:** The app works completely offline and syncs automatically when online. All operations are instant with no network blocking!

---

## 🔗 API Endpoints Used

The frontend communicates with these backend endpoints:

- `POST /api/sync` - Batch sync operations
- `PUT /api/conflicts/:id/resolve` - Resolve conflict
- `GET /api/conflicts?status=PENDING` - Get conflicts

All endpoints expect/return JSON.

## 🔒 Security Notice

⚠️ **This is a development setup. For production:**

1. Add authentication (JWT/OAuth)
2. Use HTTPS
3. Add rate limiting
4. Validate all inputs
5. Encrypt sensitive data
6. Set proper CORS
7. Add CSP headers

---

Happy coding! 🚀
