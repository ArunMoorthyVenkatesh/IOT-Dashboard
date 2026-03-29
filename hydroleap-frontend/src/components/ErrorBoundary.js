/**
 * ErrorBoundary — catches unhandled render errors in any child subtree.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Custom error UI</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to an error tracking service
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div role="alert" style={styles.root}>
        <div style={styles.box}>
          <div style={styles.icon} aria-hidden="true">⚠</div>
          <h2 style={styles.heading}>Something went wrong</h2>
          <p style={styles.message}>{this.state.errorMessage}</p>
          <button
            style={styles.btn}
            onClick={() => {
              this.setState({ hasError: false, errorMessage: "" });
              window.location.reload();
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b1120",
    padding: "24px",
  },
  box: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "20px",
    padding: "40px 36px",
    maxWidth: 480,
    textAlign: "center",
    color: "#e2e8f0",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  icon: {
    fontSize: "2.5rem",
    marginBottom: "16px",
    color: "#ef4444",
  },
  heading: {
    fontSize: "1.4rem",
    fontWeight: 700,
    marginBottom: "10px",
    color: "#f8fafc",
  },
  message: {
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "24px",
    lineHeight: 1.6,
  },
  btn: {
    padding: "10px 28px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #00d4c8, #00a89e)",
    color: "#0b1120",
    fontFamily: "inherit",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,212,200,0.3)",
  },
};
