import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PerfFlags } from '../perf/PerfFlags';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Mobile Error Boundary caught error:', error);
    console.error('🚨 Error info:', errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Notify parent
    if (this.props.onError) {
      this.props.onError(error);
    }

    if (PerfFlags.isMobile) {
      console.error('🚨 MOBILE CRASH DETECTED');
      console.error('🚨 Device:', {
        isIOS: PerfFlags.isIOS,
        isMobile: PerfFlags.isMobile,
        memory: (navigator as any).deviceMemory || 'unknown',
        userAgent: navigator.userAgent.substring(0, 100)
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleContinue = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isMobile = PerfFlags.isMobile;

      return (
        <div className="fixed inset-0 bg-gradient-to-b from-red-50 to-red-100 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Viewer Needs Refresh
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                The 3D viewer encountered a temporary issue. Please refresh to continue.
              </p>

              <div className="space-y-2">
                <button
                  onClick={this.handleReload}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Refresh Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
