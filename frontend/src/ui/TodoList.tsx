/**
 * Todo List Component
 *
 * Displays and manages todo items.
 */

import React, { useState, useEffect } from "react";
import { TodoService } from "../services/TodoService";
import { Todo } from "../db/schema";
import { syncEngine } from "../sync/SyncEngine";

const todoService = new TodoService();

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"pending" | "in-progress" | "completed">(
    "pending",
  );

  useEffect(() => {
    loadTodos();

    // Reload todos after sync
    const unsubscribe = syncEngine.addSyncListener(() => {
      loadTodos();
    });

    return unsubscribe;
  }, [filter]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      let data: Todo[];

      if (filter === "all") {
        data = await todoService.getAllTodos();
      } else {
        data = await todoService.getTodosByStatus(filter);
      }

      setTodos(data);
    } catch (error) {
      console.error("Failed to load todos:", error);
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
        await todoService.updateTodo(editingId, { title, content, status });
      } else {
        await todoService.createTodo({ title, content, status });
      }

      resetForm();
      loadTodos();
    } catch (error) {
      console.error("Failed to save todo:", error);
      alert("Failed to save todo");
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setTitle(todo.title);
    setContent(todo.content || "");
    setStatus(todo.status);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }

    try {
      await todoService.deleteTodo(id);
      loadTodos();
    } catch (error) {
      console.error("Failed to delete todo:", error);
      alert("Failed to delete todo");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setStatus("pending");
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
          <h2>Todos</h2>
          <button
            className="button button-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ New Todo"}
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
                placeholder="Enter todo title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter todo details (optional)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
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

        <div className="tabs">
          <button
            className={`tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`tab ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`tab ${filter === "in-progress" ? "active" : ""}`}
            onClick={() => setFilter("in-progress")}
          >
            In Progress
          </button>
          <button
            className={`tab ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">No todos found</div>
            <div className="empty-state-subtext">
              Create your first todo to get started
            </div>
          </div>
        </div>
      ) : (
        todos.map((todo) => (
          <div key={todo.id} className="card">
            <div className="flex justify-between items-start">
              <div style={{ flex: 1 }}>
                <div className="flex gap-2 items-center mb-2">
                  <span className={`badge badge-${todo.status}`}>
                    {todo.status}
                  </span>
                  <span className="text-xs text-gray">v{todo.version}</span>
                </div>
                <h3 style={{ margin: "0 0 8px 0" }}>{todo.title}</h3>
                {todo.content && (
                  <p
                    className="text-sm text-gray"
                    style={{ margin: "0 0 8px 0" }}
                  >
                    {todo.content}
                  </p>
                )}
                <div className="text-xs text-gray">
                  Updated: {new Date(todo.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="button button-secondary"
                  onClick={() => handleEdit(todo)}
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  Edit
                </button>
                <button
                  className="button button-danger"
                  onClick={() => handleDelete(todo.id)}
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
