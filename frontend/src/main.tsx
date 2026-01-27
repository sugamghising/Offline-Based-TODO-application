/**
 * Main Entry Point
 *
 * Bootstraps the React application.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { logger } from "./utils/logger";
import "./styles.css";

// Global error handlers
window.addEventListener("error", (event) => {
  logger.error("Global", "Unhandled error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Global", "Unhandled promise rejection", {
    reason: event.reason,
  });
});

logger.info("App", "Application starting...");

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
