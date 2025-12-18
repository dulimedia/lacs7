import React, { useEffect, useRef, useCallback } from 'react';
import { detectDevice } from '../../utils/deviceDetection';
import { ExploreTab } from './ExploreTab';
import { RequestTab } from './RequestTab';
import { SuiteDetailsTab } from './SuiteDetailsTab';
import { useSidebarState } from './useSidebarState';
import { useExploreState } from '../../store/exploreState';
import { useGLBState } from '../../store/glbState';
import { useUnitStore } from '../../stores/useUnitStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MobileDiagnostics } from '../../debug/mobileDiagnostics';
import { MobileMemoryManager } from '../../utils/memoryManager';

export default function Sidebar() {
  const { tab, setTab, view, setView, floorPlanExpanded, setFloorPlanExpanded } = useSidebarState();
  const {
    drawerOpen,
    setDrawerOpen,
    setSelected: setExploreSelected,
    setHovered: setExploreHovered,
    selectedUnitKey,
    getUnitData,
  } = useExploreState();
  const { clearSelection, cameraControlsRef, resetCameraAnimation } = useGLBState();
  const { setSelectedUnit: setGlobalSelectedUnit, setHoveredUnit: setGlobalHoveredUnit } = useUnitStore();
  const asideRef = useRef<HTMLElement | null>(null);
  const isMobile = detectDevice().isMobile;

  const lastDetailUnitRef = useRef<string | null>(null);

  const handleBackToExplore = () => {
    // Clear selection state
    setExploreSelected(null);
    setExploreHovered(null);
    setGlobalSelectedUnit(null);
    setGlobalHoveredUnit(null);

    // Reset camera to home position like home button
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.reset(true); // smooth animation
    }

    // Clear GLB selection and reset camera animation state
    clearSelection();
    resetCameraAnimation();

    // Aggressive memory cleanup to prevent memory leaks on Back to Explore
    const memoryManager = MobileMemoryManager.getInstance();
    memoryManager.aggressiveCleanup();
    console.log('🧹 Memory cleanup triggered on Back to Explore');

    setView('explore');
    setFloorPlanExpanded(false);
  };

  // Sidebar width is now static - no dynamic updates needed

  // Dynamic Sidebar Height Measurement for Camera Controls
  useEffect(() => {
    if (!asideRef.current) return;

    const updateHeight = () => {
      if (asideRef.current) {
        const height = asideRef.current.offsetHeight;
        // Set CSS variable on the app-layout or root
        document.documentElement.style.setProperty('--mobile-bottom-ui-h', `${height}px`);
        MobileDiagnostics.log('sidebar', 'Height updated', { height });
      }
    };

    // Initial check
    updateHeight();

    // Use ResizeObserver for live updates
    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(asideRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    MobileDiagnostics.log('sidebar', 'state update', {
      tab,
      view,
      floorPlanExpanded,
    });
    MobileDiagnostics.layout('sidebar', asideRef.current);
  }, [tab, view, floorPlanExpanded]);

  return (
    <>

      <aside
        ref={asideRef}
        className={cn('sidebar', floorPlanExpanded && 'floorplan-expanded')}
        role="complementary"
        aria-label="Suite Controls"
      >
        <div className="flex-shrink-0 pb-3 border-b border-black/5">
          {view === 'details' ? (
            <button
              onClick={handleBackToExplore}
              className={cn(
                "flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition",
                isMobile ? "px-2 py-2 text-base min-h-[44px]" : "text-sm"
              )}
            >
              <ChevronLeft size={isMobile ? 20 : 16} />
              <span>Back to Explore</span>
            </button>
          ) : (
            <div className={cn(
              "rounded-xl bg-black/5 p-1 w-full",
              isMobile ? "flex flex-col space-y-1" : "inline-flex"
            )}>
              <button
                className={cn(
                  'flex-1 rounded-lg font-medium transition',
                  isMobile ? 'px-4 py-2 text-sm min-h-[36px]' : 'px-3 py-1.5 text-sm',
                  tab === 'explore' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'
                )}
                onClick={() => {
                  setTab('explore');
                  setView('explore');
                }}
              >
                Explore Suites
              </button>
              <button
                className={cn(
                  'flex-1 rounded-lg font-medium transition',
                  isMobile ? 'px-4 py-2 text-sm min-h-[36px]' : 'px-3 py-1.5 text-sm',
                  tab === 'request' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'
                )}
                onClick={() => {
                  setTab('request');
                  setView('request');
                }}
              >
                Request Suites
              </button>
            </div>
          )}
        </div>

        <div className="h-[calc(100%-80px)] overflow-hidden relative mt-3">
          <div
            className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{
              transform: view === 'details' ? 'translateX(-100%)' : 'translateX(0)',
            }}
          >
            <div className="h-full overflow-y-auto">
              {tab === 'explore' ? <ExploreTab /> : <RequestTab />}
            </div>
          </div>
          <div
            className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{
              transform: view === 'details' ? 'translateX(0)' : 'translateX(100%)',
            }}
          >
            <div className="h-full">
              <SuiteDetailsTab />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
