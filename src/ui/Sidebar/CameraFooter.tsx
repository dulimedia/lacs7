import React from 'react';
import { useGLBState } from '../../store/glbState';
import { Home, ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-react';

export function CameraControls() {
  const { cameraControlsRef } = useGLBState();

  const handleReset = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.reset(true);
    }
  };

  const handleZoomIn = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.dolly(0.85, true);
    }
  };

  const handleZoomOut = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.dolly(-0.35, true);
    }
  };

  const handleRotateLeft = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.rotate(-Math.PI / 8, 0, true);
    }
  };

  const handleRotateRight = () => {
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.rotate(Math.PI / 8, 0, true);
    }
  };

  return (
    <div className="border border-black/5 bg-white rounded-lg p-3 mb-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-2">
        Camera Controls
      </label>
      <div className="grid grid-cols-5 gap-2">
        <button
          className="rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center min-h-[44px] touch-manipulation"
          onClick={handleRotateLeft}
          title="Rotate Left"
        >
          <RotateCcw size={18} />
        </button>
        <button
          className="rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center min-h-[44px] touch-manipulation"
          onClick={handleRotateRight}
          title="Rotate Right"
        >
          <RotateCw size={18} />
        </button>
        <button
          className="rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center min-h-[44px] touch-manipulation"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="rounded-lg border border-black/10 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center min-h-[44px] touch-manipulation"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="rounded-lg border border-black/10 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center min-h-[44px] touch-manipulation"
          onClick={handleReset}
          title="Reset View"
        >
          <Home size={18} />
        </button>
      </div>
    </div>
  );
}
