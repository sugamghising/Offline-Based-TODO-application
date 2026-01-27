/**
 * Note List Component
 *
 * Displays and manages note items.
 */

import React, { useState, useEffect } from "react";
import { NoteService } from "../services/NoteService";
import { Note } from "../db/schema";
import { syncEngine } from "../sync/SyncEngine";

const noteService = new NoteService();

export const NoteList: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadNotes();

    // Reload notes after sync
    const unsubscribe = syncEngine.addSyncListener(() => {
      loadNotes();
    });

    return unsubscribe;
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await noteService.getAllNotes();
      setNotes(data);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    try {
      if (editingId) {
        await noteService.updateNote(editingId, { title, content });
      } else {
        await noteService.createNote({ title, content });
      }

      resetForm();
      loadNotes();
    } catch (error) {
      console.error("Failed to save note:", error);
      alert("Failed to save note");
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      await noteService.deleteNote(id);
      loadNotes();
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setShowForm(false);
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

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h2>Notes</h2>
          <button
            className="button button-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ New Note"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-3">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter note content"
                style={{ minHeight: "150px" }}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="button button-primary">
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📔</div>
            <div className="empty-state-text">No notes found</div>
            <div className="empty-state-subtext">
              Create your first note to get started
            </div>
          </div>
        </div>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="card">
            <div className="flex justify-between items-start">
              <div style={{ flex: 1 }}>
                <div className="flex gap-2 items-center mb-2">
                  <span className="text-xs text-gray">v{note.version}</span>
                </div>
                <h3 style={{ margin: "0 0 8px 0" }}>{note.title}</h3>
                {note.content && (
                  <p
                    className="text-sm"
                    style={{ margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}
                  >
                    {note.content}
                  </p>
                )}
                <div className="text-xs text-gray">
                  Updated: {new Date(note.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="button button-secondary"
                  onClick={() => handleEdit(note)}
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  Edit
                </button>
                <button
                  className="button button-danger"
                  onClick={() => handleDelete(note.id)}
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
