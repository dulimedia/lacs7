import React, { useState, useEffect } from 'react';
import { PerfFlags } from '../perf/PerfFlags';

interface LoadingProgress {
  phase: string;
  progress: number;
  message: string;
  modelName?: string;
}

export function MobileLoadingProgress() {
  const [loadingState, setLoadingState] = useState<LoadingProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!PerfFlags.isMobile) return;

    const handleLoadingUpdate = (event: CustomEvent<LoadingProgress>) => {
      setLoadingState(event.detail);
      setIsVisible(true);
    };

    const handleLoadingStart = (event: CustomEvent) => {
      setIsVisible(true);
      setLoadingState({
        phase: 'starting',
        progress: 0,
        message: 'Preparing mobile-optimized loading...'
      });
    };

    const handleLoadingComplete = (event: CustomEvent) => {
      setLoadingState({
        phase: 'complete',
        progress: 100,
        message: 'All models loaded successfully!'
      });
      
      // Hide after 2 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    };

    const handleLoadingError = (event: CustomEvent) => {
      setLoadingState({
        phase: 'error',
        progress: 0,
        message: `Error: ${event.detail.error}`
      });
    };

    // Listen for mobile loading events
    window.addEventListener('mobile-loading-start' as any, handleLoadingStart);
    window.addEventListener('mobile-loading-update' as any, handleLoadingUpdate);
    window.addEventListener('mobile-loading-complete' as any, handleLoadingComplete);
    window.addEventListener('mobile-loading-error' as any, handleLoadingError);

    return () => {
      window.removeEventListener('mobile-loading-start' as any, handleLoadingStart);
      window.removeEventListener('mobile-loading-update' as any, handleLoadingUpdate);
      window.removeEventListener('mobile-loading-complete' as any, handleLoadingComplete);
      window.removeEventListener('mobile-loading-error' as any, handleLoadingError);
    };
  }, []);

  if (!PerfFlags.isMobile || !isVisible || !loadingState) {
    return null;
  }

  const getPhaseDisplay = (phase: string) => {
    if (phase.includes('others')) return 'Loading Environment (1/4)';
    if (phase.includes('frame')) return 'Loading Structure (2/4)';
    if (phase.includes('roof')) return 'Loading Roof & Walls (3/4)';
    if (phase.includes('stages')) return 'Loading Stages (4/4)';
    if (phase === 'complete') return 'Complete!';
    if (phase === 'error') return 'Error';
    return 'Loading...';
  };

  const getProgressColor = (phase: string) => {
    if (phase === 'error') return 'bg-red-500';
    if (phase === 'complete') return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📱 Mobile Loading
          </h3>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(loadingState.phase)}`}
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
          
          {/* Phase Display */}
          <div className="text-sm font-medium text-gray-700 mb-2">
            {getPhaseDisplay(loadingState.phase)}
          </div>
          
          {/* Progress Percentage */}
          <div className="text-lg font-bold text-gray-800 mb-2">
            {loadingState.progress}%
          </div>
          
          {/* Detailed Message */}
          <div className="text-xs text-gray-600">
            {loadingState.message}
          </div>
          
          {/* Loading Animation */}
          {loadingState.phase !== 'complete' && loadingState.phase !== 'error' && (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}