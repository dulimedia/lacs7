import { useRef, useEffect } from 'react';
import { useGLBState } from '../store/glbState';

export function MobileCameraControls() {
  const { cameraControlsRef } = useGLBState();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (!isMobile) return null;

  const handlePan = (deltaX: number, deltaY: number) => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.truck(deltaX * 0.001, deltaY * 0.001, false);
    }
  };

  const handleZoom = (delta: number) => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.dolly(delta > 0 ? 0.9 : 1.1, false);
    }
  };

  const handleRotate = (deltaX: number, deltaY: number) => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.rotate(deltaX * 0.01, deltaY * 0.01, false);
    }
  };

  const handleReset = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.reset(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
      <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-3 space-y-2 shadow-2xl">
        {/* Zoom controls */}
        <div className="flex flex-col space-y-1">
          <button
            onTouchStart={() => handleZoom(1)}
            className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-lg active:bg-white/30 transition-colors"
          >
            +
          </button>
          <button
            onTouchStart={() => handleZoom(-1)}
            className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-lg active:bg-white/30 transition-colors"
          >
            −
          </button>
        </div>
        
        {/* Reset button */}
        <button
          onTouchStart={handleReset}
          className="w-12 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs active:bg-white/30 transition-colors"
        >
          ⌂
        </button>
        
        {/* Drag area for pan/orbit */}
        <div 
          className="w-16 h-16 bg-white/10 rounded-lg border-2 border-white/20 relative overflow-hidden"
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = touch.clientX - centerX;
            const deltaY = touch.clientY - centerY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              handleRotate(deltaX, 0);
            } else {
              handlePan(0, deltaY);
            }
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
            ⟲
          </div>
        </div>
      </div>
    </div>
  );
}