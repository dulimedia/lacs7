import React, { useState, useEffect, useRef } from 'react';
import { Expand, X, Download, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';
import { getFloorplanUrl, preloadImage, FALLBACK_FLOORPLAN } from '../services/floorplanService';
import { getFloorplanUrl as getIntelligentFloorplanUrl } from '../services/floorplanMappingService';

// Helper function to check if URL points to a PDF
const isPDFUrl = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf');
};

interface FloorplanViewerProps {
  floorplanUrl: string | null;
  unitName: string;
  building?: string;
  floor?: string;
  unitId?: string;
  isExpanded?: boolean;
  onClose?: () => void;
  onExpand?: (floorplanUrl: string, unitName: string, unitData?: any) => void;
  unitData?: any;
  useThumbnail?: boolean; // New prop to control thumbnail usage
}

export const FloorplanViewer: React.FC<FloorplanViewerProps> = ({
  floorplanUrl,
  unitName,
  building,
  floor,
  unitId,
  isExpanded = false,
  onClose,
  onExpand,
  unitData,
  useThumbnail = false // Default to full resolution
}) => {
  console.log('🖼️ FloorplanViewer RENDER:', { unitName, floorplanUrl, unitData });
  
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(isExpanded);
  const [finalImageUrl, setFinalImageUrl] = useState<string>(FALLBACK_FLOORPLAN);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!useThumbnail); // Always load if not thumbnail, lazy load thumbnails
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsFullscreen(isExpanded);
  }, [isExpanded]);

  // Intersection Observer for lazy loading thumbnails
  useEffect(() => {
    if (!useThumbnail || shouldLoad) return; // Skip if not thumbnail or already loading
    
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setShouldLoad(true);
          console.log(`🖼️ FloorplanViewer: Thumbnail ${unitName} came into view, starting load`);
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before coming into view
        threshold: 0.1
      }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [useThumbnail, shouldLoad, unitName]);

  // Memory cleanup when component unmounts or unit changes
  useEffect(() => {
    return () => {
      // Clean up image reference to prevent memory leaks
      if (imageRef.current) {
        imageRef.current.src = '';
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
      console.log(`🧹 FloorplanViewer: Cleaned up ${unitName}`);
    };
  }, [unitName]);

  // Lock body scroll when fullscreen modal is open
  useEffect(() => {
    if (isFullscreen) {
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // Handle wheel events for floorplan zoom and prevent 3D scene zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // ALWAYS prevent scroll when in fullscreen modal to stop page zoom
      if (isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Only zoom the floorplan if we're over the image area
        const target = e.target as HTMLElement;
        if (target.closest('[data-floorplan-image]')) {
          const delta = e.deltaY;
          const zoomStep = 25;
          
          if (delta < 0) {
            // Zoom in
            setZoom(prev => Math.min(prev + zoomStep, 300));
          } else {
            // Zoom out
            setZoom(prev => Math.max(prev - zoomStep, 50));
          }
        }
        return;
      }
      
      // For non-fullscreen (small view), be less aggressive with event prevention
      const target = e.target as HTMLElement;
      const floorplanContainer = target.closest('[data-floorplan-image]');
      
      if (!floorplanContainer) {
        // Not over floorplan, allow normal scrolling
        return;
      }
      
      // Check if we're actively interacting with the floorplan (e.g., zoomed in)
      if (zoom > 100) {
        // If zoomed in, capture wheel events for floorplan control
        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY;
        const zoomStep = 25;
        
        if (delta < 0) {
          setZoom(prev => Math.min(prev + zoomStep, 300));
        } else {
          setZoom(prev => Math.max(prev - zoomStep, 50));
        }
      } else {
        // At default zoom (100%), allow normal page scrolling unless user holds Ctrl/Cmd
        if (e.ctrlKey || e.metaKey) {
          // User is trying to zoom, prevent default and handle
          e.preventDefault();
          e.stopPropagation();
          
          const delta = e.deltaY;
          const zoomStep = 25;
          
          if (delta < 0) {
            setZoom(prev => Math.min(prev + zoomStep, 300));
          } else {
            setZoom(prev => Math.max(prev - zoomStep, 50));
          }
        }
        // Otherwise, let the wheel event pass through for normal scrolling
      }
    };

    // Add global wheel listener when fullscreen to capture ALL wheel events
    if (isFullscreen) {
      // Listen on document to catch all wheel events
      document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
      
      return () => {
        document.removeEventListener('wheel', handleWheel, true);
      };
    } else {
      // For non-fullscreen, only listen on the container
      const container = containerRef.current;
      if (container) {
        container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        
        return () => {
          container.removeEventListener('wheel', handleWheel, true);
        };
      }
    }
  }, [isFullscreen]);

  // Handle floorplan URL changes and preloading
  useEffect(() => {
    // Don't load anything if no valid unit name provided
    if (!unitName || unitName === 'Unit') {
      console.log('🖼️ FloorplanViewer: No valid unit name provided');
      setFinalImageUrl(FALLBACK_FLOORPLAN);
      setImageLoading(false);
      setImageError(true);
      return;
    }

    // For thumbnails, wait until shouldLoad is true (intersection observer trigger)
    if (useThumbnail && !shouldLoad) {
      console.log(`🖼️ FloorplanViewer: Waiting for ${unitName} to come into view`);
      return;
    }

    // Reset all state when unit changes
    setImageLoading(true);
    setImageError(false);
    setRetryCount(0);
    setZoom(100);
    setRotation(0);

    let loadTimeout: NodeJS.Timeout | undefined;
    
    const loadFloorplan = () => {
      console.log('🖼️ FloorplanViewer: Loading floorplan for unit:', unitName);
      console.log('🖼️ FloorplanViewer: Input floorplanUrl:', floorplanUrl);
      console.log('🖼️ FloorplanViewer: Unit data:', unitData);
      
      // First try intelligent mapping, then fallback to original service
      let intelligentUrl = getIntelligentFloorplanUrl(unitName, unitData);
      console.log('🖼️ FloorplanViewer: Intelligent mapping returned:', intelligentUrl);
      
      let finalUrl: string;
      
      if (intelligentUrl) {
        // Use the floorplanService to construct the URL (thumbnail for sidebar, full-res for expanded)
        finalUrl = getFloorplanUrl(intelligentUrl, FALLBACK_FLOORPLAN, useThumbnail);
        console.log(`🖼️ FloorplanViewer: Final URL (from intelligent) [${useThumbnail ? 'THUMBNAIL' : 'FULL-RES'}]:`, finalUrl);
      } else if (floorplanUrl) {
        // Use the floorplanService to construct the URL (thumbnail for sidebar, full-res for expanded)
        finalUrl = getFloorplanUrl(floorplanUrl, FALLBACK_FLOORPLAN, useThumbnail);
        console.log(`🖼️ FloorplanViewer: Final URL (from prop) [${useThumbnail ? 'THUMBNAIL' : 'FULL-RES'}]:`, finalUrl);
      } else {
        console.warn('⚠️ FloorplanViewer: No floorplan URL found, using fallback');
        finalUrl = FALLBACK_FLOORPLAN;
        setImageLoading(false);
        setImageError(true);
        setFinalImageUrl(finalUrl);
        return;
      }
      
      // Only proceed if we have a valid URL
      if (finalUrl && finalUrl !== FALLBACK_FLOORPLAN) {
        console.log(`✅ FloorplanViewer: Setting ${useThumbnail ? 'THUMBNAIL' : 'FULL-RES'} image URL:`, finalUrl);
        setFinalImageUrl(finalUrl);
        
        // Set a timeout to prevent infinite loading state
        loadTimeout = setTimeout(() => {
          console.warn('⏱️ FloorplanViewer: Image load timeout after 10 seconds');
          if (imageLoading) {
            setImageLoading(false);
            setImageError(true);
          }
        }, 10000);
      } else {
        console.warn('⚠️ FloorplanViewer: Invalid final URL, using fallback');
        setFinalImageUrl(FALLBACK_FLOORPLAN);
        setImageLoading(false);
        setImageError(true);
      }
    };
    
    loadFloorplan();
    
    // Return cleanup function
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [floorplanUrl, unitName, unitData, useThumbnail, shouldLoad]);

  const handleImageLoad = () => {
    const imageType = useThumbnail ? 'THUMBNAIL' : 'FULL-RES';
    const imageElement = imageRef.current;
    const dimensions = imageElement ? `${imageElement.naturalWidth}x${imageElement.naturalHeight}` : 'unknown';
    console.log(`✅ FloorplanViewer: ${imageType} image loaded successfully:`, {
      url: finalImageUrl.split('/').pop(),
      dimensions,
      unit: unitName,
      memoryEstimate: imageElement ? `${Math.round((imageElement.naturalWidth * imageElement.naturalHeight * 4) / 1024)}KB` : 'unknown'
    });
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error('❌ FloorplanViewer: Image failed to load:', finalImageUrl);
    console.error('❌ FloorplanViewer: Retry count:', retryCount);
    setImageLoading(false);
    if (retryCount < 2 && finalImageUrl !== FALLBACK_FLOORPLAN) {
      // Retry up to 2 times for non-fallback images
      console.log('🔄 FloorplanViewer: Retrying image load...');
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageLoading(true);
        setImageError(false);
      }, 1000);
    } else {
      // Use fallback image
      console.warn('⚠️ FloorplanViewer: Max retries reached, using fallback');
      setFinalImageUrl(FALLBACK_FLOORPLAN);
      setImageError(true);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setImageLoading(true);
    setImageError(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (finalImageUrl && finalImageUrl !== FALLBACK_FLOORPLAN) {
      const link = document.createElement('a');
      link.href = finalImageUrl;
      // Always download as PNG (highest quality)
      link.download = `${unitName}-floorplan.png`;
      link.click();
    }
  };

  const handleToggleFullscreen = () => {
    if (onExpand && finalImageUrl) {
      // For expansion, always use high-resolution URL, not thumbnail
      const highResUrl = useThumbnail 
        ? getFloorplanUrl(floorplanUrl || finalImageUrl, FALLBACK_FLOORPLAN, false) 
        : finalImageUrl;
      // Use the new popup system with high-res URL
      onExpand(highResUrl, unitName, unitData);
    } else {
      // Fallback to internal fullscreen
      setIsFullscreen(!isFullscreen);
    }
  };

  // Component now always renders with either the actual image or fallback
  // No need for early return since we have fallback handling

  const viewerContent = (
    <>
      {/* Controls */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center space-x-1 sm:space-x-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-1.5 sm:p-2 z-20">
        <button
          onClick={handleZoomOut}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Zoom Out"
        >
          <ZoomOut size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-[40px] sm:min-w-[50px] text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Zoom In"
        >
          <ZoomIn size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        <div className="w-px h-4 sm:h-6 bg-gray-300 mx-1" />
        <button
          onClick={handleRotate}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Rotate"
        >
          <RotateCw size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        {finalImageUrl !== FALLBACK_FLOORPLAN && (
          <button
            onClick={handleDownload}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation hidden sm:block"
            title="Download"
          >
            <Download size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
        {!isExpanded && (
          <button
            onClick={handleToggleFullscreen}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
            title="Expand"
          >
            <Expand size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
        {isFullscreen && onClose && (
          <button
            onClick={() => {
              setIsFullscreen(false);
              onClose();
            }}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
            title="Close"
          >
            <X size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
      </div>

      {/* Image Container */}
      <div 
        className={`${isFullscreen ? 'overflow-auto' : 'overflow-hidden'} relative bg-gray-50 rounded-lg`}
        data-floorplan-image
        style={{
          contain: 'layout style paint',
          willChange: isFullscreen ? 'scroll-position' : 'auto'
        }}
      >
        {/* Loading indicator */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
        
        {/* Image */}
        <div
          className={`flex items-center justify-center p-4 ${isFullscreen ? 'min-h-[300px]' : 'min-h-[200px]'}`}
          data-floorplan-image
        >
          {shouldLoad ? (
            isPDFUrl(finalImageUrl) ? (
              // PDF placeholder with download link
              <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300" style={{ scrollMargin: 0 }}>
                <FileText size={48} className="text-gray-500 mb-4" />
                <p className="text-gray-700 font-medium mb-2">{unitName} Floorplan</p>
                <p className="text-sm text-gray-500 mb-4">PDF Document</p>
                <a 
                  href={finalImageUrl}
                  download
                  tabIndex={-1}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </a>
              </div>
            ) : (
              <img
                ref={imageRef}
                key={`${unitName}-${finalImageUrl}`}
                src={finalImageUrl}
                alt={`${unitName} Floorplan`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={`max-w-full h-auto transition-all duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'} ${imageError ? 'hidden' : 'block'} ${useThumbnail ? 'thumbnail-optimized' : ''}`}
                style={{
                  maxHeight: isFullscreen ? 'none' : useThumbnail ? '200px' : '300px',
                  objectFit: 'contain',
                  width: useThumbnail ? '100%' : 'auto',
                  height: useThumbnail ? 'auto' : 'auto',
                  // Apply transforms directly to the image for better performance
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  // Performance optimizations for thumbnail mode
                  ...(useThumbnail && {
                    imageRendering: 'auto',
                    backfaceVisibility: 'hidden',
                    willChange: 'auto'
                  })
                }}
                loading={useThumbnail ? 'lazy' : 'eager'} // Lazy load thumbnails, eager load full-res
                decoding={useThumbnail ? 'async' : 'auto'} // Async decoding for thumbnails
              />
            )
          ) : (
            // Placeholder for lazy-loaded thumbnails
            <div 
              className="flex items-center justify-center bg-gray-100 rounded"
              style={{
                minHeight: useThumbnail ? '150px' : '200px',
                maxHeight: useThumbnail ? '200px' : '300px'
              }}
            >
              <div className="text-gray-400 text-sm text-center">
                <div className="w-8 h-8 mx-auto mb-2 opacity-40">
                  📄
                </div>
                {useThumbnail ? 'Loading...' : unitName}
              </div>
            </div>
          )}
          
          {/* Error message */}
          {imageError && !imageLoading && (
            <div className="text-center text-gray-500 p-4">
              <div className="text-sm">Floorplan not available</div>
              <div className="text-xs text-gray-400 mt-1">{unitName}</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      {!isFullscreen && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {finalImageUrl === FALLBACK_FLOORPLAN 
              ? `${unitName} • No floorplan available for this unit`
              : `${unitName} Floorplan • Click expand for full view`
            }
          </p>
        </div>
      )}
    </>
  );

  // Fullscreen Modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-8">
        <div 
          ref={containerRef}
          className="bg-white rounded-xl shadow-2xl max-w-[95vw] max-h-[95vh] sm:max-w-[90vw] sm:max-h-[90vh] w-full h-full relative"
        >
          <div className="absolute top-4 left-4 z-20">
            <h2 className="text-xl font-semibold text-gray-900">{unitName} Floorplan</h2>
          </div>
          {viewerContent}
        </div>
      </div>
    );
  }

  // Inline Viewer
  return (
    <div className="relative bg-white rounded-lg shadow-sm border floorplan-container">
      {viewerContent}
    </div>
  );
};