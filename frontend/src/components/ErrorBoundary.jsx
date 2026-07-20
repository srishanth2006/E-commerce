import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <AlertTriangle size={48} className="mx-auto text-red-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
