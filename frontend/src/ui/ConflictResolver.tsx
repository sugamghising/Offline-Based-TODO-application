/**
 * Conflict Resolver Component
 *
 * UI for resolving sync conflicts.
 * Shows side-by-side diff of server vs client data.
 */

import React, { useState, useEffect } from "react";
import { ConflictService, ResolutionChoice } from "../sync/ConflictService";
import { Conflict } from "../db/schema";

const conflictService = new ConflictService();

export const ConflictResolver: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const data = await conflictService.getPendingConflicts();
      setConflicts(data);
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (choice: ResolutionChoice, customData?: any) => {
    if (!selectedConflict) return;

    try {
      setResolving(true);
      await conflictService.resolveConflict({
        conflictId: selectedConflict.id,
        resolution: choice,
        customData,
      });

      // Reload conflicts
      await loadConflicts();
      setSelectedConflict(null);

      alert("Conflict resolved successfully!");
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
      alert("Failed to resolve conflict. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const renderConflictDetails = (conflict: Conflict) => {
    const serverData = JSON.parse(conflict.serverData);
    const clientData = JSON.parse(conflict.clientData);

    return (
      <div className="modal-overlay" onClick={() => setSelectedConflict(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Resolve Conflict</h2>
            <button
              className="modal-close"
              onClick={() => setSelectedConflict(null)}
            >
              ×
            </button>
          </div>

          <div>
            <p className="text-gray mb-2">
              Entity: <strong>{conflict.entity}</strong> | ID:{" "}
              <code>{conflict.entityId}</code>
            </p>
            <p className="text-gray mb-2">
              Server Version: <strong>{conflict.serverVersion}</strong> | Client
              Version: <strong>{conflict.clientVersion}</strong>
            </p>
          </div>

          <div className="diff-container mt-3">
            <div className="diff-panel">
              <h3>Server Version</h3>
              {Object.entries(serverData).map(([key, value]) => (
                <div key={key} className="diff-field">
                  <div className="diff-field-label">{key}</div>
                  <div className="diff-field-value">
                    {value === null ? "<null>" : String(value)}
                  </div>
                </div>
              ))}
            </div>

            <div className="diff-panel">
              <h3>Client Version (Your Changes)</h3>
              {Object.entries(clientData).map(([key, value]) => (
                <div key={key} className="diff-field">
                  <div className="diff-field-label">{key}</div>
                  <div className="diff-field-value">
                    {value === null ? "<null>" : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="button button-secondary"
              onClick={() => handleResolve("SERVER")}
              disabled={resolving}
            >
              Keep Server Version
            </button>
            <button
              className="button button-primary"
              onClick={() => handleResolve("CLIENT")}
              disabled={resolving}
            >
              Keep My Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">No Conflicts</div>
          <div className="empty-state-subtext">
            All changes are synced successfully
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Conflicts ({conflicts.length})</h2>
        <p className="text-gray mb-3">
          Resolve conflicts between your local changes and server data
        </p>

        {conflicts.map((conflict) => {
          const clientData = JSON.parse(conflict.clientData);
          return (
            <div
              key={conflict.id}
              className="card"
              style={{ marginTop: "12px" }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="badge badge-conflict">CONFLICT</span>
                    <span className="badge">{conflict.entity}</span>
                  </div>
                  <div className="text-sm">
                    <strong>{clientData.title}</strong>
                  </div>
                  <div className="text-xs text-gray mt-1">
                    Version mismatch: Server v{conflict.serverVersion} vs Your v
                    {conflict.clientVersion}
                  </div>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => setSelectedConflict(conflict)}
                >
                  Resolve
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedConflict && renderConflictDetails(selectedConflict)}
    </>
  );
};
