import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-zinc-900">
          <div className="max-w-md p-8 bg-white dark:bg-zinc-800 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">出错了！</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              应用遇到了一个错误：
            </p>
            <pre className="p-4 bg-gray-100 dark:bg-zinc-900 rounded text-sm overflow-auto">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

