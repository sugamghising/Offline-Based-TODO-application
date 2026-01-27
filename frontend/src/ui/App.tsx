/**
 * Main App Component
 *
 * Root component that coordinates the entire application.
 */

import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { TodoList } from "./TodoList";
import { NoteList } from "./NoteList";
import { ConflictResolver } from "./ConflictResolver";
import { db } from "../db/sqlite";
import { syncEngine } from "../sync/SyncEngine";
import { logger } from "../utils/logger";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"todos" | "notes" | "conflicts">(
    "todos",
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      logger.info("App", "Initializing application...");

      // 1. Initialize SQLite database
      await db.initialize();
      logger.info("App", "Database initialized");

      // 2. Trigger initial sync
      await syncEngine.sync();
      logger.info("App", "Initial sync completed");

      // 3. Start auto-sync every 30 seconds
      syncEngine.startAutoSync(30);
      logger.info("App", "Auto-sync started");

      // 4. Listen for sync events to update conflict count
      syncEngine.addSyncListener(async () => {
        const status = await syncEngine.getStatus();
        setConflictCount(status.pendingConflicts);
      });

      setIsInitialized(true);
    } catch (error) {
      logger.error("App", "Failed to initialize application", error);
      alert("Failed to initialize app. Please refresh the page.");
    }
  };

  if (!isInitialized) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginLeft: "16px" }}>Initializing app...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />

      <div className="tabs">
        <button
          className={`tab ${activeTab === "todos" ? "active" : ""}`}
          onClick={() => setActiveTab("todos")}
        >
          📝 Todos
        </button>
        <button
          className={`tab ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          📔 Notes
        </button>
        <button
          className={`tab ${activeTab === "conflicts" ? "active" : ""}`}
          onClick={() => setActiveTab("conflicts")}
        >
          ⚠️ Conflicts {conflictCount > 0 && `(${conflictCount})`}
        </button>
      </div>

      {activeTab === "todos" && <TodoList />}
      {activeTab === "notes" && <NoteList />}
      {activeTab === "conflicts" && <ConflictResolver />}
    </div>
  );
};
