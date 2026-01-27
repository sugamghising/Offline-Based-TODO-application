/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI.
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("ErrorBoundary", "React component error caught", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container">
          <div className="card" style={{ marginTop: "40px", padding: "32px" }}>
            <h1 style={{ color: "#e74c3c", marginBottom: "16px" }}>
              ⚠️ Something went wrong
            </h1>
            <p style={{ marginBottom: "24px", color: "#555" }}>
              The application encountered an error. Please try refreshing the
              page.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: "24px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  Error details
                </summary>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "16px",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "12px",
                    marginTop: "8px",
                  }}
                >
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
