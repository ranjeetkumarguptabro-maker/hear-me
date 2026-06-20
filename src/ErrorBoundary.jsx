import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "40px",
          maxWidth: "800px",
          margin: "40px auto",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ color: "#ef4444", marginBottom: "20px" }}>
            ⚠️ Something went wrong
          </h1>
          <p style={{ marginBottom: "20px", color: "#666" }}>
            The application encountered an error. Please check the browser console for more details.
          </p>
          {this.state.error && (
            <details style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#f9fafb",
              borderRadius: "4px",
              border: "1px solid #e5e7eb"
            }}>
              <summary style={{ cursor: "pointer", fontWeight: "600", marginBottom: "10px" }}>
                Error Details
              </summary>
              <pre style={{
                fontSize: "12px",
                overflow: "auto",
                color: "#dc2626"
              }}>
                {this.state.error.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre style={{
                  fontSize: "11px",
                  overflow: "auto",
                  marginTop: "10px",
                  color: "#666"
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

