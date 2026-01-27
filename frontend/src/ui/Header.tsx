/**
 * Header Component
 *
 * Shows app title, network status, and sync controls.
 */

import React, { useState, useEffect } from "react";
import { syncEngine, SyncResult } from "../sync/SyncEngine";
import { networkDetector } from "../utils/networkDetector";

export const Header: React.FC = () => {
  const [isOnline, setIsOnline] = useState(networkDetector.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Listen to network changes
    const unsubscribeNetwork = networkDetector.addListener((online) => {
      setIsOnline(online);
    });

    // Listen to sync events
    const unsubscribeSync = syncEngine.addSyncListener((result: SyncResult) => {
      setLastSync(new Date().toLocaleTimeString());
      updateStatus();
    });

    // Initial status
    updateStatus();

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, []);

  const updateStatus = async () => {
    const status = await syncEngine.getStatus();
    setIsSyncing(status.isSyncing);
    setPendingCount(status.pendingOperations);
  };

  const handleSync = async () => {
    try {
      await syncEngine.forceSync();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  return (
    <div className="header">
      <div>
        <h1>📝 Offline Todo App</h1>
        {lastSync && (
          <div className="text-xs text-gray mt-1">Last sync: {lastSync}</div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <div className={`status-badge ${isOnline ? "online" : "offline"}`}>
          <span className="status-indicator"></span>
          {isOnline ? "Online" : "Offline"}
        </div>

        {pendingCount > 0 && (
          <div className="badge badge-pending">{pendingCount} pending</div>
        )}

        <button
          className="button button-primary"
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
        >
          {isSyncing ? "🔄 Syncing..." : "🔄 Sync Now"}
        </button>
      </div>
    </div>
  );
};
