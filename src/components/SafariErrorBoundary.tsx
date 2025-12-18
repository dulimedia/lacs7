import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isSafari: boolean;
  isMobile: boolean;
}

export class SafariErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /iPad|iPhone|iPod|Android|Mobi|Mobile/i.test(userAgent);

    this.state = {
      hasError: false,
      isSafari,
      isMobile
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /iPad|iPhone|iPod|Android|Mobi|Mobile/i.test(userAgent);

    return {
      hasError: true,
      error,
      isSafari,
      isMobile
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (!this.state.hasError) {
      console.error('Safari Error Boundary caught an error:', error, errorInfo);

      if (this.state.isSafari && this.state.isMobile) {
        console.error('Safari Mobile Error Details:', {
          userAgent: navigator.userAgent,
          memory: (performance as any).memory,
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Safari-specific error message
      return (
        <div className="absolute inset-0 flex flex-col justify-center items-center z-50 bg-white">
          <div className="max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-3xl">✨</div>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Viewer Needs Refresh
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              The 3D viewer encountered a temporary issue. Please refresh to continue.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh Viewer
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>

      );
    }

    return this.props.children;
  }
}